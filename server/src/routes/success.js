const express = require('express');
const { LicenseRepository } = require('../repositories/licenseRepository');

const router = express.Router();

router.get('/success', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send('<h2>Error</h2><p>Email parameter is required.</p>');
    }

    // Attempt to fetch the most recently created license for this email
    // Note: If the webhook is delayed by PayPal, the license might not be there instantly.
    // In production, we'd poll or use websockets, but for MVP we just delay a bit or query normally.
    const result = await require('../db').query(
      "SELECT * FROM licenses WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [email]
    );

    const license = result.rows[0];

    if (!license) {
      return res.send(`
        <html>
        <head><title>Processing Payment</title><style>body { font-family: sans-serif; text-align: center; padding: 50px; background: #111827; color: white; }</style></head>
        <body>
          <h2>Payment Processing...</h2>
          <p>We are waiting for PayPal to confirm your payment. Your license will be sent to <b>${email}</b> shortly.</p>
          <p>Please check your inbox or refresh this page in a minute.</p>
          <script>setTimeout(() => window.location.reload(), 5000);</script>
        </body>
        </html>
      `);
    }

    res.send(`
      <html>
      <head><title>Payment Successful</title><style>body { font-family: sans-serif; text-align: center; padding: 50px; background: #111827; color: white; } .key {font-size: 24px; background: #374151; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px;} .btn {background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;}</style></head>
      <body>
        <h2>Payment Successful! 🎉</h2>
        <p>Thank you for choosing Chameleon.</p>
        <p>Your license key has been generated and sent to: <b>${email}</b></p>
        <div style="margin-top: 30px; font-size: 0.9em; color: #9ca3af;">
          <p>Please check your <b>Spam/Junk</b> folder if you don't see it in a few minutes.</p>
          <p>Once you have the key, enter it into the Chameleon Agent to activate your device.</p>
        </div>
        <br>
        <p>Plan: ${license.type === 'lifetime' ? 'Lifetime Access ($25)' : 'Weekly Plan ($5/week)'}</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Success page error:', error);
    res.status(500).send('Internal Server Error fetching license.');
  }
});

module.exports = router;
