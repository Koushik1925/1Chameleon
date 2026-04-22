const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send license key to user
 * @param {string} email 
 * @param {string} licenseKey 
 * @param {'lifetime'|'subscription'} licenseType 
 */
async function sendLicenseEmail(email, licenseKey, licenseType) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn(`[Email Service] SMTP not configured. Would send ${licenseType} key ${licenseKey} to ${email}.`);
    return;
  }

  const subject = `Your ${licenseType === 'lifetime' ? 'Lifetime' : 'Subscription'} License for Chameleon`;

  const html = `
    <h2>Welcome to Chameleon! 🎉</h2>
    <p>Your ${licenseType} license has been activated.</p>
    
    <h3>Your License Key:</h3>
    <p><code style="font-size: 16px; font-weight: bold; background: #f0f0f0; padding: 10px; display: block; margin: 10px 0;">
      ${licenseKey}
    </code></p>
    
    <h3>How to Use:</h3>
    <ol>
      <li>Download Chameleon</li>
      <li>Launch the app</li>
      <li>Enter your license key: <strong>${licenseKey}</strong></li>
      <li>Enjoy unlimited remote desktop access!</li>
    </ol>
    
    <p>
      ${licenseType === 'subscription' ? 'Your subscription will auto-renew monthly.' : 'Your license is valid forever.'}
    </p>
    
    <p>Questions? Contact support@chameleon.app</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@chameleon.app',
      to: email,
      subject,
      html
    });
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send email to ${email}:`, err);
  }
}

module.exports = { sendLicenseEmail };
