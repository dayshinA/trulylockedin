import type Stripe from "stripe";

import {
  fulfilCheckout,
  releaseExpiredCheckout,
} from "@/lib/booking/deposit";
import {
  fulfilOrderCheckout,
  releaseExpiredOrderCheckout,
} from "@/lib/shop/payment";
import { stripe, webhookSecret } from "@/lib/stripe";

// Stripe calls this for booking deposits and shop orders (told apart by the
// session's metadata: orderId for orders). Register it for:
//   checkout.session.completed
//   checkout.session.async_payment_succeeded
//   checkout.session.expired
// Locally: stripe listen --forward-to localhost:3000/api/stripe/webhook
//
// Events can arrive twice or out of order; the handlers are idempotent. A 500
// makes Stripe retry (for up to 3 days in live mode).
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  // The signature covers the exact bytes, so read the raw body.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("No stripe-signature header");
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret());
  } catch (error) {
    console.warn("Stripe webhook refused", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.metadata?.orderId) await fulfilOrderCheckout(session.id);
        else await fulfilCheckout(session.id);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        if (session.metadata?.orderId) await releaseExpiredOrderCheckout(session);
        else await releaseExpiredCheckout(session);
        break;
      }
    }
  } catch (error) {
    console.error("Stripe webhook failed", event.type, event.id, error);
    return new Response("Webhook handler failed", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
