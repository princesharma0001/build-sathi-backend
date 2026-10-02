import './env'; // makes sure dotenv is loaded first

const isProd = process.env.CASHFREE_ENV === 'production';

export const cashfreeConfig = {
  environment: isProd ? ('production' as const) : ('sandbox' as const),

  baseUrl: isProd
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg',

  clientId: process.env.CASHFREE_APP_ID || '',
  clientSecret: process.env.CASHFREE_SECRET_KEY || '',
  apiVersion: process.env.CASHFREE_API_VERSION || '2025-01-01',

  // Where Cashfree sends the user after checkout ({order_id} is replaced by Cashfree)
  returnUrl:
    process.env.CASHFREE_RETURN_URL ||
    'http://localhost:5000/api/v1/subscriptions/dev/payment-result?order_id={order_id}',

  // Must be a public HTTPS URL (use ngrok locally). Leave empty to skip webhooks.
  webhookUrl: process.env.CASHFREE_WEBHOOK_URL || '',
};