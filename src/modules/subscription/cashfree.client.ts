import crypto from 'crypto';

import {cashfreeConfig} from '../../config/cashfree';

// Thin wrapper over the Cashfree Payment Gateway REST API.
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create

export interface CashfreeOrder {
  cf_order_id?: string | number;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED';
  payment_session_id?: string;
}

export interface CashfreePayment {
  cf_payment_id?: string | number;
  payment_status: 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'PENDING' | 'CANCELLED' | string;
  payment_amount?: number;
  payment_group?: string;
  payment_message?: string;
  payment_time?: string;
  error_details?: {error_description?: string; error_reason?: string} | null;
}

const assertConfigured = () => {
  if (!cashfreeConfig.clientId || !cashfreeConfig.clientSecret) {
    throw new Error(
      'Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env',
    );
  }
};

const request = async <T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> => {
  assertConfigured();

  const response = await fetch(`${cashfreeConfig.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-version': cashfreeConfig.apiVersion,
      'x-client-id': cashfreeConfig.clientId,
      'x-client-secret': cashfreeConfig.clientSecret,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {message: text};
  }

  if (!response.ok) {
    throw new Error(
      `Cashfree error (${response.status}): ${data?.message || 'request failed'}`,
    );
  }

  return data as T;
};

export interface CreateCashfreeOrderInput {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  note?: string;
}

export const createCashfreeOrder = (input: CreateCashfreeOrderInput) =>
  request<CashfreeOrder>('POST', '/orders', {
    order_id: input.orderId,
    order_amount: Number(input.amount.toFixed(2)),
    order_currency: input.currency,
    order_note: input.note,
    customer_details: {
      customer_id: input.customerId,
      customer_phone: input.customerPhone,
      ...(input.customerName ? {customer_name: input.customerName} : {}),
      ...(input.customerEmail ? {customer_email: input.customerEmail} : {}),
    },
    order_meta: {
      return_url: cashfreeConfig.returnUrl,
      ...(cashfreeConfig.webhookUrl
        ? {notify_url: cashfreeConfig.webhookUrl}
        : {}),
    },
  });

export const fetchCashfreeOrder = (orderId: string) =>
  request<CashfreeOrder>('GET', `/orders/${encodeURIComponent(orderId)}`);

export const fetchCashfreePayments = (orderId: string) =>
  request<CashfreePayment[]>(
    'GET',
    `/orders/${encodeURIComponent(orderId)}/payments`,
  );

// Sandbox only: force a payment attempt to SUCCESS / FAILED
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest/simulation/simulate-payment
export const simulateCashfreePayment = (
  cfPaymentId: string,
  status: 'SUCCESS' | 'FAILED' = 'SUCCESS',
) =>
  request<any>('POST', '/simulate', {
    entity: 'PAYMENTS',
    entity_id: cfPaymentId,
    payment_status: status,
    ...(status === 'FAILED' ? {payment_error_code: 'TXN_FAILED'} : {}),
  });

// signature = base64( HMAC-SHA256( timestamp + rawBody, clientSecret ) )
export const verifyWebhookSignature = (
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
) => {
  if (!timestamp || !signature || !cashfreeConfig.clientSecret) return false;

  const expected = crypto
    .createHmac('sha256', cashfreeConfig.clientSecret)
    .update(timestamp + rawBody)
    .digest('base64');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
};