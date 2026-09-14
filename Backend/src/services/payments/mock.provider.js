/**
 * mock.provider.js — Placeholder payment provider (no money moves)
 *
 * Returns a checkout session with the same shape a real provider will return,
 * so the frontend can be built against it now. The link points at a frontend
 * route (/checkout/mock) that can simulate success/failure.
 */

import crypto from 'node:crypto';
import config from '../../config/env.js';

const SESSION_TTL_MS = 30 * 60 * 1000; // real providers expire links too (Stripe: 24h max, Razorpay: configurable)

const createCheckout = async ({ orderId, amount, currency, metadata }) => {
    const providerOrderId = `mock_${crypto.randomBytes(8).toString('hex')}`;
    const params = new URLSearchParams({ orderId, ref: providerOrderId, courseId: metadata.courseId });

    return {
        provider: 'mock',
        orderId,
        providerOrderId,
        paymentLink: `${config.clientUrl}/checkout/mock?${params}`,
        amount,
        currency,
        status: 'created',
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
};

export default { name: 'mock', createCheckout };
