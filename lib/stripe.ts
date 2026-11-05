import "server-only";

import Stripe from "stripe";

import { formatLocalDate } from "@/lib/format";
import type { Booking } from "@/types/booking";

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

// Repeating a call with the same attempt returns the same refund, so a double
// submit can't refund twice (Stripe also refuses to refund more than was paid).
export async function refundPayment(
  paymentIntentId: string,
  bookingId: string,
  attempt: string,
): Promise<string> {
  const refund = await stripe().refunds.create(
    { payment_intent: paymentIntentId, metadata: { bookingId } },
    { idempotencyKey: `deposit-refund-${bookingId}-${attempt}` },
  );
  return refund.id;
}
