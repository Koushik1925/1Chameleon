const express = require('express');
const axios = require('axios');
const db = require('../db');
const { LicenseRepository } = require('../repositories/licenseRepository');
const { LicenseValidator } = require('../services/licenseValidator');
const { sendLicenseEmail } = require('../services/email');

const router = express.Router();

// Helper to check for duplicate webhook event (idempotency)
async function paymentExists(transactionId) {
  const res = await db.query('SELECT 1 FROM payments WHERE paypal_transaction_id = $1', [transactionId]);
  return res.rowCount > 0;
}

// PayPal webhook verification
async function verifyPayPalWebhook(webhookId, eventBody) {
  const isSandbox = (process.env.PAYPAL_MODE || 'live') === 'sandbox';
  const paypalHost = isSandbox ? 'api-m.sandbox.paypal.com' : 'api-m.paypal.com';
  
  try {
    const response = await axios.post(
      `https://${paypalHost}/v1/notifications/verify-webhook-signature`,
      {
        transmission_id: eventBody.headers['paypal-transmission-id'],
        transmission_time: eventBody.headers['paypal-transmission-time'],
        cert_url: eventBody.headers['paypal-cert-url'],
        auth_algo: eventBody.headers['paypal-auth-algo'],
        transmission_sig: eventBody.headers['paypal-transmission-sig'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: eventBody.body
      },
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_SECRET
        }
      }
    );

    return response.data.verification_status === 'SUCCESS';
  } catch (error) {
    console.warn(`[PayPal Webhook] Verification skipped or failed. Run with valid PAYPAL_CLIENT_ID. Error: ${error.message}`);
    // Return true in development if no client id is set, for easier testing. In prod, fail.
    return !process.env.PAYPAL_CLIENT_ID; 
  }
}

// PAYMENT.CAPTURE.COMPLETED or CHECKOUT.ORDER.APPROVED → Create lifetime license
async function handleLifetimePayment(resource, eventId) {
  if (await paymentExists(eventId)) {
    console.log(`[Webhook] Event ${eventId} already processed (Idempotency skip).`);
    return;
  }

  // Extract email based on the actual payload structure of the orders API
  const email = resource.payer?.email_address || resource.custom || '';
  const amount = parseFloat(resource.amount?.value || '0');

  // Check if they already have an active lifetime license just in case
  let license = await LicenseRepository.getActiveLicenseByEmailAndType(email, 'lifetime');
  let rawKey = null;

  if (!license) {
    const result = await LicenseRepository.createLicense(email, 'lifetime');
    license = result;
    rawKey = result.license_key;
    console.log(`[Webhook] Created new lifetime license for ${email} (ID: ${license.id})`);
    await sendLicenseEmail(email, rawKey, 'lifetime');
  } else {
    console.log(`[Webhook] User ${email} already has an active lifetime license (ID: ${license.id}). Skipping re-creation.`);
  }

  await LicenseRepository.recordPayment(license.id, eventId, amount, 'one-time', 'LIFETIME_CAPTURE', resource);
}

// BILLING.SUBSCRIPTION.ACTIVATED → Create weekly subscription license
async function handleSubscriptionActivated(resource, eventId) {
  if (await paymentExists(eventId)) {
     console.log(`[Webhook] Event ${eventId} already processed (Idempotency skip).`);
     return;
  }
  
  const email = resource.subscriber?.email_address || resource.custom_id || '';
  const subId = resource.id;

  const expiresAt = LicenseValidator.calculateExpiration(7); // 7 days
  
  let license = await LicenseRepository.getActiveLicenseByEmailAndType(email, 'subscription');
  let rawKey = null;

  if (!license) {
    const result = await LicenseRepository.createLicense(email, 'subscription', 7);
    license = result;
    rawKey = result.license_key;
    console.log(`[Webhook] Created new 7-day subscription for ${email} (ID: ${license.id})`);
    await sendLicenseEmail(email, rawKey, 'subscription');
  } else {
    // Already has one, just update the expiry
    await db.query('UPDATE licenses SET expires_at = $1 WHERE id = $2', [expiresAt, license.id]);
    console.log(`[Webhook] Updated existing subscription expiry for ${email} (ID: ${license.id})`);
  }

  // Record subscription metadata
  await db.query(
    `INSERT INTO subscriptions (license_id, paypal_subscription_id, billing_cycle_days, next_billing_date, status)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (paypal_subscription_id) DO NOTHING`,
    [license.id, subId, 7, expiresAt, 'active']
  );

  const amount = parseFloat(resource.billing_info?.last_payment?.amount?.value || resource.billing_cycles?.[0]?.pricing_scheme?.amount?.value || '0');
  await LicenseRepository.recordPayment(license.id, eventId, amount, 'subscription_initial', 'BILLING.SUBSCRIPTION.ACTIVATED', resource);
}

// BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED → Extend expiration by 7 days
async function handleSubscriptionPaymentSucceeded(resource, eventId) {
  if (await paymentExists(eventId)) {
     console.log(`[Webhook] Event ${eventId} already processed (Idempotency skip).`);
     return;
  }

  // usually resource.id is the payment transaction ID or subscription ID depending on payload
  // In PAYMENT.SUCCEEDED, billing_agreement_id is the subscription ID
  const subId = resource.billing_agreement_id || resource.id;

  const subResult = await db.query(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = $1',
    [subId]
  );
  const subscription = subResult.rows[0];

  if (!subscription) {
    console.log(`[Webhook] Subscription not found for PAYMENT.SUCCEEDED: ${subId}`);
    return;
  }

  const license = await LicenseRepository.renewSubscription(subscription.license_id, 7); // Extend by 7 days

  if (license) {
    await db.query(
      `UPDATE subscriptions
       SET renewal_count = renewal_count + 1, next_billing_date = $1, updated_at = NOW()
       WHERE id = $2`,
      [LicenseValidator.calculateExpiration(7), subscription.id]
    );

    await LicenseRepository.recordPayment(license.id, eventId, amount, 'subscription_renewal', 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED', resource);
    console.log(`[Webhook] Renewed weekly subscription for ID: ${license.id}`);
  }
}

// BILLING.SUBSCRIPTION.CANCELLED → Update status
async function handleSubscriptionCancelled(resource) {
  const subId = resource.id;

  const subResult = await db.query(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = $1',
    [subId]
  );
  const subscription = subResult.rows[0];

  if (!subscription) {
    console.log(`[Webhook] Subscription not found: ${subId}`);
    return;
  }

  await db.query(
    'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2',
    ['cancelled', subscription.id]
  );
  await LicenseRepository.updateStatus(subscription.license_id, 'cancelled');

  console.log(`[Webhook] Cancelled subscription: ${subId}`);
}

// PAYMENT.SALE.DENIED or PAYMENT.SALE.FAILED -> Expire
async function handlePaymentFailed(resource) {
  const subId = resource.billing_agreement_id || resource.id;

  const subResult = await db.query(
    'SELECT * FROM subscriptions WHERE paypal_subscription_id = $1',
    [subId]
  );
  const subscription = subResult.rows[0];

  if (subscription) {
     await LicenseRepository.updateStatus(subscription.license_id, 'expired');
     console.log(`[Webhook] Expired subscription due to payment failure: ${subId}`);
  } else {
     console.log(`[Webhook] Payment failed: ${subId}`);
  }
}

// Main webhook handler
router.post('/paypal-webhook', async (req, res) => {
  try {
    const eventBody = {
      headers: req.headers,
      body: req.body
    };

    // Verify PayPal signature
    const isValid = await verifyPayPalWebhook(req.body.id, eventBody);
    if (!isValid) {
      console.log('[Webhook] Invalid PayPal webhook signature');
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const eventType = req.body.event_type;
    const resource = req.body.resource;
    const eventId = req.body.id;

    console.log(`[Webhook] Processing event: ${eventType} (${eventId})`);

    // 1. Replay Protection: Check transmission time (Reject if > 10 mins old)
    const transmissionTime = req.headers['paypal-transmission-time'];
    if (transmissionTime) {
      const txDate = new Date(transmissionTime);
      const now = new Date();
      const diffMins = (now - txDate) / 1000 / 60;
      if (diffMins > 10) {
        console.warn(`[Webhook] REPLAY ATTACK BLOCKED: Event ${eventId} is ${Math.round(diffMins)} mins old.`);
        return res.status(401).json({ success: false, error: 'Event expired' });
      }
    }

    switch (eventType) {
      // Lifetime events
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.APPROVED':
        await handleLifetimePayment(resource, eventId);
        break;
      
      // Subscription events
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource, eventId);
        break;
      case 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED':
        await handleSubscriptionPaymentSucceeded(resource, eventId);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(resource);
        break;
      
      // Failures
      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.FAILED':
        await handlePaymentFailed(resource);
        break;
      
      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    res.json({ status: 'processed', event_type: eventType });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
