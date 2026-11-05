"use server";

import { getMember } from "@/lib/auth/member-dal";
import { clientKey } from "@/lib/client-key";
import { notifyOrder } from "@/lib/email/order-emails";
import { rememberMemberPhone } from "@/lib/members/remember-phone";
import { createRateLimiter } from "@/lib/rate-limit";
import { holdTimes } from "@/lib/booking/deposit-rules";
import { siteOrigin } from "@/lib/site-origin";
import {
  abandonOrderCheckout,
  fulfilOrderCheckout,
  refundOrder,
} from "@/lib/shop/payment";
import { createOrderCheckout } from "@/lib/stripe";
import {
  cancelManagedOrder,
  findManagedOrder,
  findOwnOrder,
  type ManageOrderCredentials,
  type ManageOrderResult,
} from "@/lib/shop/manage";
import { orderRepository } from "@/lib/shop/server";
import { submitOrder, type SubmitOrderResult } from "@/lib/shop/submit";

// Per-process; see lib/rate-limit.ts.
const orderLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
// "Find my order" (ref + email) guesses; the private link isn't limited.
const lookupLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const TOO_MANY_LOOKUPS: ManageOrderResult = {
  ok: false,
  error: "Too many attempts. Please try again in a few minutes.",
};

async function lookupAllowed(input: ManageOrderCredentials): Promise<boolean> {
  return !("email" in input) || lookupLimiter.hit(await clientKey());
}

// Guests and members use the same form. A signed-in member's orders are
// linked to their account, and the phone they used is remembered.
export async function placeOrder(
  input: Record<string, unknown>,
): Promise<SubmitOrderResult> {
  const member = await getMember();
  const now = new Date();
  const siteUrl = await siteOrigin();
  const result = await submitOrder(orderRepository(), input, {
    now,
    clientKey: await clientKey(),
    limiter: orderLimiter,
    memberId: member?.uid,
    startCheckout: (order) =>
      createOrderCheckout(order, {
        siteUrl,
        expiresAt: holdTimes(now).checkoutExpiresAt,
      }),
  });
  if (result.ok && member) await rememberMemberPhone(member, input.phone);
  // An online order's emails wait for its payment (lib/shop/payment.ts).
  if (result.ok && !result.checkoutUrl) {
    notifyOrder({
      kind: "created",
      ref: result.order.ref,
      cancelToken: result.cancelToken,
    });
  }
  return result;
}

// Self-service via the link shown after ordering (/shop/order/{ref}#t={token})
// or "Find my order" (/shop/order/find: ref + email).
export async function getMyOrder(
  input: ManageOrderCredentials,
): Promise<ManageOrderResult> {
  if (!(await lookupAllowed(input))) return TOO_MANY_LOOKUPS;
  return findManagedOrder(orderRepository(), input);
}

export async function cancelMyOrder(
  input: ManageOrderCredentials,
): Promise<ManageOrderResult> {
  if (!(await lookupAllowed(input))) return TOO_MANY_LOOKUPS;
  const repo = orderRepository();
  const result = await cancelManagedOrder(repo, input, new Date());
  if (!result.ok) return result;
  // Paid online: the customer gets their money back.
  const order = await repo.getOrderByRef(result.order.ref);
  if (order && (await refundOrder(order))) {
    notifyOrder({ kind: "customer_cancelled", by: { id: order.id } });
    return findManagedOrder(repo, input);
  }
  notifyOrder({ kind: "customer_cancelled", by: { ref: result.order.ref } });
  return result;
}

// Back from Stripe's payment page (/shop/order/{ref}?session_id=…). The
// webhook normally confirms first; this covers a slow webhook.
export async function confirmOrderPaymentReturn(
  sessionId: unknown,
): Promise<void> {
  if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) {
    return;
  }
  try {
    await fulfilOrderCheckout(sessionId);
  } catch (error) {
    console.error("Order payment check on return failed", error);
  }
}

// The customer left Stripe's payment page without paying. Needs the private
// token, so only the person who ordered can release it.
export async function abandonOrderPayment(input: {
  ref: string;
  token: string;
}): Promise<{ outcome: "released" | "paid" | "unchanged" }> {
  const order = await findOwnOrder(orderRepository(), {
    ref: String(input.ref),
    token: String(input.token),
  });
  if (!order) return { outcome: "unchanged" };
  try {
    return { outcome: await abandonOrderCheckout(order) };
  } catch (error) {
    console.error("Releasing an unpaid order failed", order.id, error);
    return { outcome: "unchanged" };
  }
}
