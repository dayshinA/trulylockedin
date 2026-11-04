"use server";

import { getMember } from "@/lib/auth/member-dal";
import { clientKey } from "@/lib/client-key";
import { rememberMemberPhone } from "@/lib/members/remember-phone";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  cancelManagedOrder,
  findManagedOrder,
  type ManageOrderResult,
} from "@/lib/shop/manage";
import { orderRepository } from "@/lib/shop/server";
import { submitOrder, type SubmitOrderResult } from "@/lib/shop/submit";

// Per-process; see lib/rate-limit.ts.
const orderLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

// Guests and members use the same form. A signed-in member's orders are
// linked to their account, and the phone they used is remembered.
export async function placeOrder(
  input: Record<string, unknown>,
): Promise<SubmitOrderResult> {
  const member = await getMember();
  const result = await submitOrder(orderRepository(), input, {
    now: new Date(),
    clientKey: await clientKey(),
    limiter: orderLimiter,
    memberId: member?.uid,
  });
  if (result.ok && member) await rememberMemberPhone(member, input.phone);
  return result;
}

// Self-service via the link shown after ordering (/shop/order/{ref}#t={token}).
export async function getMyOrder(input: {
  ref: string;
  token: string;
}): Promise<ManageOrderResult> {
  return findManagedOrder(orderRepository(), input);
}

export async function cancelMyOrder(input: {
  ref: string;
  token: string;
}): Promise<ManageOrderResult> {
  return cancelManagedOrder(orderRepository(), input, new Date());
}
