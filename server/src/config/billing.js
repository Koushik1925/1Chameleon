module.exports = {
  currency: process.env.CURRENCY || "INR",
  productName: "Chameleon Pro",
  invoicePrefix: process.env.INVOICE_PREFIX || "CHM",
  gracePeriodDays: 0,
  renewalReminderDays: [7, 3, 1],
  orderExpirySeconds: 1800, // 30 minutes
  billingPortalUrl: process.env.BILLING_PORTAL_URL || "http://localhost:5173/billing"
};
