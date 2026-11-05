import "server-only";

import Stripe from "stripe";

import { notifyBooking } from "@/lib/email/booking-emails";
import {
  expireCheckout,
  refundPayment,
  retrieveCheckout,
} from "@/lib/stripe";
import type { Booking, BookingDeposit } from "@/types/booking";
import { bookingRepository } from "./server";

// Deposit payments, shared by the Stripe webhook, the thank-you page and the
// admin. Every function here is safe to run more than once for the same
// payment: the repository's transactions decide who confirms.

export type FulfilResult =
  | "confirmed"
  | "already"
  | "refunded"
  | "unpaid"
  | "ignored";

// Stripe's word on a payment page, fetched fresh (never trusted from the
// browser). A paid page confirms its booking and sends the emails once.
export async function fulfilCheckout(sessionId: string): Promise<FulfilResult> {
  const session = await retrieveCheckout(sessionId);
  // Shop orders use the same Stripe account (lib/shop/payment.ts).
  if (session.metadata?.orderId) return "ignored";
  const bookingId = session.metadata?.bookingId ?? session.client_reference_id;
  if (!bookingId) return "ignored";
  if (session.payment_status !== "paid") return "unpaid";

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error(`Paid session ${session.id} has no payment`);

  const repo = bookingRepository();
  const now = new Date();
  const result = await repo.confirmDeposit(
    bookingId,
    {
      checkoutSessionId: session.id,
      paymentIntentId,
      amountPence: session.amount_total ?? 0,
    },
    now,
  );

  switch (result.kind) {
    case "confirmed":
      notifyBooking({ kind: "deposit_paid", id: bookingId });
      return "confirmed";
    case "already":
      return "already";
    case "refund":
      // The hold had gone (or its time was taken) by the time the payment
      // arrived: give the money back and tell both sides.
      if (result.booking?.deposit?.paymentIntentId === paymentIntentId) {
        await refundDeposit(result.booking);
        notifyBooking({ kind: "late_payment_refunded", id: bookingId });
      } else {
        // No booking holds this payment (released, or paid by another one):
        // refund this payment only, never the booking's own deposit.
        console.error("Deposit paid with no booking to keep it", bookingId);
        // Throws on failure, so the webhook answers 500 and Stripe retries.
        await refundPayment(paymentIntentId, { bookingId }, paymentIntentId);
      }
      return "refunded";
  }
}

// The salon cancelled (or a late payment couldn't be kept). Records the
// outcome on the booking; a failed refund is marked so the owner can retry.
export async function refundDeposit(
  booking: Booking,
): Promise<BookingDeposit | null> {
  const deposit = booking.deposit;
  if (
    !deposit?.paymentIntentId ||
    (deposit.status !== "paid" && deposit.status !== "refund_failed")
  ) {
    return null;
  }
  const now = new Date();
  let next: BookingDeposit;
  try {
    const refundId = await refundPayment(
      deposit.paymentIntentId,
      { bookingId: booking.id },
      // A failed attempt's error is remembered by Stripe for its key.
      deposit.status === "paid" ? "first" : `retry-${now.getTime()}`,
    );
    next = { ...deposit, status: "refunded", refundId, refundedAt: now.toISOString() };
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeError &&
      error.code === "charge_already_refunded"
    ) {
      next = { ...deposit, status: "refunded", refundedAt: now.toISOString() };
    } else {
      console.error("Deposit refund failed", booking.id, error);
      next = { ...deposit, status: "refund_failed" };
    }
  }
  await bookingRepository().updateDeposit(booking.id, next, now);
  return next;
}

// The client left the payment page. Ends it at Stripe first, so a payment
// can't complete after the time is released; if it was in fact paid, that
// payment is kept instead.
export async function abandonCheckout(
  booking: Booking,
): Promise<"released" | "paid" | "unchanged"> {
  if (booking.status !== "awaiting_deposit") return "unchanged";
  const sessionId = booking.deposit?.checkoutSessionId;
  if (sessionId && !(await expireCheckout(sessionId))) {
    const result = await fulfilCheckout(sessionId);
    return result === "confirmed" || result === "already" ? "paid" : "unchanged";
  }
  const released = await bookingRepository().releaseHold(booking.id, sessionId);
  return released ? "released" : "unchanged";
}

// checkout.session.expired: nobody paid in time.
export async function releaseExpiredCheckout(session: {
  id: string;
  metadata: Record<string, string> | null;
  client_reference_id: string | null;
}): Promise<void> {
  if (session.metadata?.orderId) return;
  const bookingId = session.metadata?.bookingId ?? session.client_reference_id;
  if (bookingId) await bookingRepository().releaseHold(bookingId, session.id);
}
