import "server-only";

import Stripe from "stripe";

import { formatLocalDate } from "@/lib/format";
import type { Booking } from "@/types/booking";
import type { Order } from "@/types/shop";

// The salon's Stripe account (sandbox key in development). Deposits use
// Stripe-hosted Checkout, so card details never reach this site. The API
// version is the one this SDK version is pinned to.

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(key, { maxNetworkRetries: 2 }));
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

// The Stripe payment page for a booking held as awaiting_deposit. Expires at
// `expiresAt` (unix seconds); the client comes back to the thank-you page, or
// to the payment-cancelled page if they press back.
export async function createDepositCheckout(
  booking: Booking,
  { siteUrl, expiresAt }: { siteUrl: string; expiresAt: number },
): Promise<{ id: string; url: string }> {
  const amount = booking.deposit?.amountPence;
  if (!amount) throw new Error(`Booking ${booking.id} has no deposit`);
  const ref = encodeURIComponent(booking.ref);
  const when = `${formatLocalDate(booking.date, "long")}, ${booking.start}`;
  const metadata = { bookingId: booking.id, ref: booking.ref };

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      // Cards only: Apple Pay and Google Pay come with card. Methods that take
      // days to confirm (bank transfers) can't hold a time slot.
      allowed_payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: amount,
            product_data: {
              name: `Deposit: ${booking.service.name}`,
              description: `${when}. Non-refundable unless we cancel. The rest is paid at your appointment.`,
            },
          },
        },
      ],
      customer_email: booking.client.email,
      client_reference_id: booking.id,
      metadata,
      payment_intent_data: {
        metadata,
        description: `Deposit ${booking.ref}`,
      },
      submit_type: "book",
      locale: "en-GB",
      expires_at: expiresAt,
      success_url: `${siteUrl}/book/${ref}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/book/${ref}/payment-cancelled`,
    },
    // A retried request returns the same page instead of making a second one.
    { idempotencyKey: `deposit-checkout-${booking.id}` },
  );
  if (!session.url) throw new Error("Stripe returned no Checkout URL");
  return { id: session.id, url: session.url };
}

export function retrieveCheckout(sessionId: string) {
  return stripe().checkout.sessions.retrieve(sessionId);
}

// Ends an unpaid payment page early. Returns false if it was already paid
// (or otherwise can't be expired), so the caller can check the payment.
export async function expireCheckout(sessionId: string): Promise<boolean> {
  try {
    const session = await stripe().checkout.sessions.expire(sessionId);
    return session.status === "expired";
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) return false;
    throw error;
  }
}

// The Stripe payment page for an order paid online. Same lifetime as a
// deposit page; back to the order page when paid, to the basket if not.
export async function createOrderCheckout(
  order: Order,
  { siteUrl, expiresAt }: { siteUrl: string; expiresAt: number },
): Promise<{ id: string; url: string }> {
  const ref = encodeURIComponent(order.ref);
  const metadata = { orderId: order.id, ref: order.ref };
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      // Cards only (with Apple Pay and Google Pay), as for deposits.
      allowed_payment_method_types: ["card"],
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: item.pricePence,
          product_data: { name: item.name },
        },
      })),
      customer_email: order.client.email,
      client_reference_id: order.id,
      metadata,
      payment_intent_data: { metadata, description: `Order ${order.ref}` },
      submit_type: "pay",
      locale: "en-GB",
      expires_at: expiresAt,
      success_url: `${siteUrl}/shop/order/${ref}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/shop/basket?unpaid=${ref}`,
    },
    { idempotencyKey: `order-checkout-${order.id}` },
  );
  if (!session.url) throw new Error("Stripe returned no Checkout URL");
  return { id: session.id, url: session.url };
}

// What a payment belongs to, kept on the refund in Stripe.
export type PaymentOwner = { bookingId: string } | { orderId: string };

// Repeating a call with the same attempt returns the same refund, so a double
// submit can't refund twice (Stripe also refuses to refund more than was paid).
export async function refundPayment(
  paymentIntentId: string,
  owner: PaymentOwner,
  attempt: string,
): Promise<string> {
  const key =
    "bookingId" in owner
      ? `deposit-refund-${owner.bookingId}`
      : `order-refund-${owner.orderId}`;
  const refund = await stripe().refunds.create(
    { payment_intent: paymentIntentId, metadata: owner },
    { idempotencyKey: `${key}-${attempt}` },
  );
  return refund.id;
}
