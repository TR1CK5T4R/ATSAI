/**
 * payments/index.js — Pluggable payment-provider facade (Strategy pattern)
 *
 * Business code (courses.service.js) only ever calls:
 *      payments.createCheckout(order) → checkout session
 *
 * The provider is chosen by PAYMENT_PROVIDER, so going live is a config change
 * plus one new provider file — no changes to module code:
 *
 *      PAYMENT_PROVIDER=mock      → mock.provider.js (default; no money moves)
 *      PAYMENT_PROVIDER=razorpay  → TODO: razorpay.provider.js (Orders API + Payment Links)
 *      PAYMENT_PROVIDER=stripe    → TODO: stripe.provider.js (Checkout Sessions)
 *
 * Every provider MUST implement:
 *      name: string
 *      createCheckout({
 *          orderId,        // our id, e.g. 'order_…' (use as Razorpay receipt / Stripe client_reference_id)
 *          amount,         // integer in the currency's minor unit (paise / cents) — both SDKs require this
 *          currency,       // ISO 4217, e.g. 'USD', 'INR'
 *          description,    // shown on the payment page
 *          customer: { id, email, name },
 *          metadata: { courseId, userId },
 *      }) → Promise<{ provider, orderId, providerOrderId, paymentLink, amount, currency, status: 'created', expiresAt }>
 *
 * Still to add when a real provider goes in: an Order table (status
 * created → paid/failed) and a webhook route that verifies the provider's
 * signature before granting access. Never trust the client's "payment done".
 */

import config from '../../config/env.js';
import mockProvider from './mock.provider.js';

const PROVIDERS = { mock: mockProvider };

if (!PROVIDERS[config.paymentProvider]) {
    console.warn(
        `⚠️  Unknown PAYMENT_PROVIDER '${config.paymentProvider}' — falling back to 'mock'. ` +
        `Available: ${Object.keys(PROVIDERS).join(', ')}`
    );
}

const active = PROVIDERS[config.paymentProvider] ?? mockProvider;

const payments = {
    providerName: active.name,
    createCheckout: (order) => active.createCheckout(order),
};

export default payments;
