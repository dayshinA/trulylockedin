import "server-only";

import Stripe from "stripe";

import { notifyOrder } from "@/lib/email/order-emails";
import {
  expireCheckout,
  refundPayment,
  retrieveCheckout,
} from "@/lib/stripe";
import type { Order, OrderPayment } from "@/types/shop";
import { orderRepository } from "./server";

// Online payment for shop orders, shared by the Stripe webhook, the order page
// and the admin. Like lib/booking/deposit.ts, every function is safe to run
// more than once for the same payment.

export type OrderFulfilResult = "confirmed" | "already" | "refunded" | "unpaid";

// Stripe's word on a payment page, fetched fresh. A paid page turns its order
// into a normal new order and sends the emails once.
export async function fulfilOrderCheckout(
  sessionId: string,
): Promise<OrderFulfilResult> {
  const session = await retrieveCheckout(sessionId);
  const orderId = session.metadata?.orderId;
  if (!orderId) return "unpaid";
  if (session.payment_status !== "paid") return "unpaid";
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error(`Paid session ${session.id} has no payment`);

  const result = await orderRepository().confirmPayment(
    orderId,
    {
      checkoutSessionId: session.id,
      paymentIntentId,
      amountPence: session.amount_total ?? 0,
    },
    new Date(),
  );
  switch (result.kind) {
    case "confirmed":
      notifyOrder({ kind: "paid", id: orderId });
      return "confirmed";
    case "already":
      return "already";
    case "refund":
      // The order was released before the payment landed (very rare): give
      // the money back. Throws on failure, so the webhook retries.
      console.error("Order paid with nothing waiting for it", orderId);
      await refundPayment(paymentIntentId, { orderId }, paymentIntentId);
      return "refunded";
  }
}

// Full refund of an order's online payment: the owner's "Refund customer"
// button, or a paid order being cancelled. Records the outcome on the order.
export async function refundOrder(order: Order): Promise<OrderPayment | null> {
  const payment = order.payment;
  if (
    !payment?.paymentIntentId ||
    (payment.status !== "paid" && payment.status !== "refund_failed")
  ) {
    return null;
  }
  const now = new Date();
  let next: OrderPayment;
  try {
    const refundId = await refundPayment(
      payment.paymentIntentId,
      { orderId: order.id },
      // A failed attempt's error is remembered by Stripe for its key.
      payment.status === "paid" ? "first" : `retry-${now.getTime()}`,
    );
    next = { ...payment, status: "refunded", refundId, refundedAt: now.toISOString() };
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeError &&
      error.code === "charge_already_refunded"
    ) {
      next = { ...payment, status: "refunded", refundedAt: now.toISOString() };
    } else {
      console.error("Order refund failed", order.id, error);
      next = { ...payment, status: "refund_failed" };
    }
  }
  await orderRepository().updatePayment(order.id, next, now);
  return next;
}

// The customer came back without paying. Ends the payment page first, so it
// can't be paid after the order is gone; if it was paid after all, keeps it.
export async function abandonOrderCheckout(
  order: Order,
): Promise<"released" | "paid" | "unchanged"> {
  if (order.status !== "awaiting_payment") return "unchanged";
  const sessionId = order.payment?.checkoutSessionId;
  if (sessionId && !(await expireCheckout(sessionId))) {
    const result = await fulfilOrderCheckout(sessionId);
    return result === "confirmed" || result === "already" ? "paid" : "unchanged";
  }
  const released = await orderRepository().releaseUnpaid(order.id, sessionId);
  return released ? "released" : "unchanged";
}

// checkout.session.expired for an order: nobody paid in time.
export async function releaseExpiredOrderCheckout(session: {
  id: string;
  metadata: Record<string, string> | null;
}): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (orderId) await orderRepository().releaseUnpaid(orderId, session.id);
}
