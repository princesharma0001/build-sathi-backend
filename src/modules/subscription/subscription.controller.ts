import {Request, Response} from 'express';

import {AuthRequest} from '../../middleware/auth.middleware';

import {cashfreeConfig} from '../../config/cashfree';
import {verifyWebhookSignature} from './cashfree.client';
import {
  createPurchaseOrder,
  getSellerOrder,
  listSellerOrders,
  simulateSandboxPayment,
  syncOrderWithCashfree,
} from './subscription.payment';

import {
  PlanInput,
  activateSubscription,
  createPlan,
  getPlanById,
  getQuotaSummary,
  listPlans,
  updatePlan,
} from './subscription.service';

/* -------------------------
   Validation
------------------------- */

const isPositiveInt = (v: unknown) => Number.isInteger(v) && (v as number) > 0;

const validatePlanBody = (body: any, partial: boolean): string | null => {
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has('code')) {
    if (typeof body.code !== 'string' || !/^[A-Z][A-Z0-9_]{1,29}$/.test(body.code)) {
      return 'Plan code is required (uppercase letters, numbers, underscore), e.g. STANDARD';
    }
  }

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return 'Plan name is required';
    }
  }

  if (!partial || has('price')) {
    if (typeof body.price !== 'number' || body.price < 0) {
      return 'Price must be a number, 0 or more';
    }
  }

  if (!partial || has('quotationLimit')) {
    if (!isPositiveInt(body.quotationLimit)) {
      return 'quotationLimit must be a whole number greater than 0';
    }
  }

  if (has('validityDays') && body.validityDays !== null && !isPositiveInt(body.validityDays)) {
    return 'validityDays must be a whole number greater than 0, or null for no expiry';
  }

  if (has('hasTrustedBadge') && typeof body.hasTrustedBadge !== 'boolean') {
    return 'hasTrustedBadge must be true or false';
  }

  if (has('isActive') && typeof body.isActive !== 'boolean') {
    return 'isActive must be true or false';
  }

  if (has('sortOrder') && !Number.isInteger(body.sortOrder)) {
    return 'sortOrder must be a whole number';
  }

  if (
    has('features') &&
    (!Array.isArray(body.features) || body.features.some((f: unknown) => typeof f !== 'string'))
  ) {
    return 'features must be an array of strings';
  }

  return null;
};

const pickPlanFields = (body: any): Partial<PlanInput> => {
  const out: Partial<PlanInput> = {};

  if (body.code !== undefined) out.code = body.code;
  if (body.name !== undefined) out.name = body.name.trim();
  if (body.description !== undefined) out.description = body.description?.trim() || null;
  if (body.price !== undefined) out.price = body.price;
  if (body.quotationLimit !== undefined) out.quotationLimit = body.quotationLimit;
  if (body.validityDays !== undefined) out.validityDays = body.validityDays;
  if (body.hasTrustedBadge !== undefined) out.hasTrustedBadge = body.hasTrustedBadge;
  if (body.features !== undefined) out.features = body.features;
  if (body.sortOrder !== undefined) out.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) out.isActive = body.isActive;

  return out;
};

/* =========================================================
   PUBLIC / SELLER
========================================================= */

// GET /subscriptions/plans
export const getPlansController = async (_req: Request, res: Response) => {
  try {
    const plans = await listPlans(false);

    return res.status(200).json({
      success: true,
      message: 'Subscription plans fetched successfully',
      data: {plans},
    });
  } catch (error: any) {
    console.error('GET PLANS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to fetch subscription plans',
    });
  }
};

// GET /subscriptions/plans/:id
export const getPlanController = async (req: Request, res: Response) => {
  try {
    const plan = await getPlanById(String(req.params.id));

    return res.status(200).json({
      success: true,
      data: {plan},
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error?.message || 'Subscription plan not found',
    });
  }
};

// GET /subscriptions/me  (SELLER)
export const getMySubscriptionController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    const summary = await getQuotaSummary(sellerId);

    return res.status(200).json({
      success: true,
      message: 'Subscription status fetched successfully',
      data: summary,
    });
  } catch (error: any) {
    console.error('GET MY SUBSCRIPTION ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to fetch subscription status',
    });
  }
};

/* =========================================================
   ADMIN
========================================================= */

// GET /subscriptions/admin/plans  (includes inactive plans)
export const adminListPlansController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const plans = await listPlans(true);

    return res.status(200).json({
      success: true,
      data: {plans},
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Unable to fetch subscription plans',
    });
  }
};

// POST /subscriptions/admin/plans
export const createPlanController = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const problem = validatePlanBody(body, false);

    if (problem) {
      return res.status(400).json({success: false, message: problem});
    }

    const plan = await createPlan({
      features: [],
      ...pickPlanFields(body),
    } as PlanInput);

    return res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: {plan},
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to create subscription plan',
    });
  }
};

// PATCH /subscriptions/admin/plans/:id
export const updatePlanController = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const problem = validatePlanBody(body, true);

    if (problem) {
      return res.status(400).json({success: false, message: problem});
    }

    const plan = await updatePlan(String(req.params.id), pickPlanFields(body));

    return res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: {plan},
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to update subscription plan',
    });
  }
};

// POST /subscriptions/admin/grant  { sellerId, planId }
export const grantSubscriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {sellerId, planId} = req.body || {};

    if (!sellerId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'sellerId and planId are required',
      });
    }

    const subscription = await activateSubscription(
      sellerId,
      planId,
      'ADMIN_GRANT',
    );

    return res.status(201).json({
      success: true,
      message: 'Subscription granted successfully',
      data: {subscription},
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to grant subscription',
    });
  }
};

/* =========================================================
   PURCHASE (Cashfree)
========================================================= */

// POST /subscriptions/purchase  { planId }  (SELLER)
export const purchasePlanController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const sellerId = req.user?.userId;
    const {planId} = req.body || {};

    if (!sellerId) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    if (!planId) {
      return res.status(400).json({success: false, message: 'planId is required'});
    }

    const order = await createPurchaseOrder(sellerId, planId);

    return res.status(201).json({
      success: true,
      message: 'Order created. Complete the payment using paymentSessionId.',
      data: {
        orderId: order.orderId,
        paymentSessionId: order.paymentSessionId,
        amount: order.amount,
        currency: order.currency,
        environment: cashfreeConfig.environment,
        plan: order.plan,
        // Local testing only: open this URL in a browser to finish a sandbox payment
        ...(process.env.NODE_ENV !== 'production' && order.paymentSessionId
          ? {
              devCheckoutUrl: `${req.protocol}://${req.get('host')}/api/v1/subscriptions/dev/checkout?session=${encodeURIComponent(order.paymentSessionId)}`,
            }
          : {}),
        order,
      },
    });
  } catch (error: any) {
    console.error('PURCHASE PLAN ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to create order',
    });
  }
};

// POST /subscriptions/orders/:orderId/verify  (SELLER)
export const verifyOrderController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    const {order, quota, cashfree} = (await syncOrderWithCashfree(
      String(req.params.orderId),
      sellerId,
    )) as any;

    const message =
      order.status === 'PAID'
        ? 'Payment successful. Subscription activated.'
        : order.status === 'FAILED'
          ? 'Payment failed or the order expired.'
          : 'Payment not completed yet.';

    return res.status(200).json({
      success: true,
      message,
      data: {
        status: order.status,
        order,
        quota,
        // What Cashfree currently says about this order and its payment attempts
        cashfree,
      },
    });
  } catch (error: any) {
    console.error('VERIFY ORDER ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to verify payment',
    });
  }
};

// GET /subscriptions/orders  (SELLER)
export const listOrdersController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    const orders = await listSellerOrders(sellerId);

    return res.status(200).json({success: true, data: {orders}});
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to fetch orders',
    });
  }
};

// GET /subscriptions/orders/:orderId  (SELLER)
export const getOrderController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    const order = await getSellerOrder(sellerId, String(req.params.orderId));

    return res.status(200).json({success: true, data: {order}});
  } catch (error: any) {
    return res.status(404).json({
      success: false,
      message: error?.message || 'Order not found',
    });
  }
};

/* =========================================================
   WEBHOOK  (POST /subscriptions/webhook/cashfree)
   Mounted in app.ts BEFORE express.json() so we get the raw body.
========================================================= */

export const cashfreeWebhookController = async (
  req: Request,
  res: Response,
) => {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body || {});

    const valid = verifyWebhookSignature(
      rawBody,
      req.headers['x-webhook-timestamp'] as string | undefined,
      req.headers['x-webhook-signature'] as string | undefined,
    );

    if (!valid) {
      return res.status(401).json({success: false, message: 'Invalid signature'});
    }

    const event = JSON.parse(rawBody);
    const orderId = event?.data?.order?.order_id;

    // Only payment events for our orders matter; acknowledge everything else
    if (orderId && String(event?.type || '').startsWith('PAYMENT_')) {
      try {
        await syncOrderWithCashfree(orderId);
      } catch (error) {
        console.error('WEBHOOK SYNC ERROR:', error);
      }
    }

    return res.status(200).json({success: true});
  } catch (error) {
    console.error('CASHFREE WEBHOOK ERROR:', error);

    return res.status(400).json({success: false});
  }
};

/* =========================================================
   DEV ONLY (sandbox testing)
========================================================= */

// POST /subscriptions/dev/orders/:orderId/simulate-payment  { status?: "SUCCESS" | "FAILED" }
export const simulatePaymentController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    const status = req.body?.status === 'FAILED' ? 'FAILED' : 'SUCCESS';

    const {order, quota, cashfree} = (await simulateSandboxPayment(
      sellerId,
      String(req.params.orderId),
      status,
    )) as any;

    return res.status(200).json({
      success: true,
      message:
        order.status === 'PAID'
          ? 'Payment simulated. Subscription activated.'
          : 'Payment simulated. Order is not paid yet - run verify again in a few seconds.',
      data: {status: order.status, order, quota, cashfree},
    });
  } catch (error: any) {
    console.error('SIMULATE PAYMENT ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error?.message || 'Unable to simulate payment',
    });
  }
};

// Browser page that opens Cashfree hosted checkout. OPEN IT IN A BROWSER, not Postman
// (Postman only shows the HTML text and never runs the script).
export const devCheckoutPage = (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  const session = String(req.query.session || '');

  // Dev page only: drop the strict security headers so Cashfree's SDK can load.
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');

  return res.type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>BuildSathi sandbox checkout</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:24px auto">
<h3>BuildSathi - sandbox checkout</h3>
<p id="status">Loading Cashfree SDK...</p>
<pre id="log" style="background:#f4f4f4;padding:8px;white-space:pre-wrap;word-break:break-all"></pre>
<button id="go" disabled>Open checkout</button>
<script>
  const SESSION = ${JSON.stringify(session)};
  const MODE = ${JSON.stringify(cashfreeConfig.environment)};
  const log = (m) => { document.getElementById('log').textContent += m + '\\n'; };
  const setStatus = (m) => { document.getElementById('status').textContent = m; };

  // Cashfree sometimes returns ids ending in "paymentpayment"; the valid form ends in "payment"
  const fixed = SESSION.replace(/paymentpayment$/, 'payment');

  log('session length: ' + SESSION.length + ' | mode: ' + MODE);
  if (fixed !== SESSION) log('note: id ends with "paymentpayment", will retry with "payment" if needed');

  async function run() {
    setStatus('Opening checkout...');
    const cashfree = Cashfree({ mode: MODE });
    const ids = fixed !== SESSION ? [SESSION, fixed] : [SESSION];
    for (const id of ids) {
      try {
        log('trying checkout with ...' + id.slice(-24));
        const result = await cashfree.checkout({ paymentSessionId: id, redirectTarget: '_self' });
        if (result && result.error) { log('error: ' + JSON.stringify(result.error)); continue; }
        if (result && result.paymentDetails) { setStatus('Payment finished. Go back to Postman and run Verify.'); log(JSON.stringify(result.paymentDetails)); }
        return;
      } catch (e) { log('exception: ' + (e && e.message ? e.message : e)); }
    }
    setStatus('Checkout could not be opened. See the log above.');
  }

  document.getElementById('go').onclick = run;
  window.addEventListener('load', () => {
    if (typeof Cashfree === 'undefined') {
      setStatus('Cashfree SDK did not load (network, ad-blocker or firewall).');
      return;
    }
    document.getElementById('go').disabled = false;
    run();
  });
</script>
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
</body></html>`);
};

export const devPaymentResultPage = (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).send('Not found');
  }

  const orderId = String(req.query.order_id || '').replace(/[^\w-]/g, '');

  return res.type('html').send(
    `<h3>Checkout finished</h3><p>Order: <b>${orderId}</b></p><p>Now go back to Postman and run <b>Verify payment</b>.</p>`,
  );
};