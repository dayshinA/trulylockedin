import { z } from "zod";

import {
  normalizeRef,
  ORDER_REF_RE,
  sameEmail,
  tokenMatches,
} from "@/lib/booking/tokens";
import type { DeliveryAddress, OrderItem, OrderStatus } from "@/types/shop";
import type { OrderRepository } from "./order-repository";
import { canCustomerCancel } from "./orders";

// Customer self-service, two ways in:
// - the private link shown after ordering, /shop/order/{ref}#t={cancelToken};
// - "Find my order" (/shop/order/find): the ref plus the email used to order.
// The ref alone grants nothing.

export type OrderSummary = {
  ref: string;
  items: OrderItem[];
  totalPence: number;
  status: OrderStatus;
  clientName: string;
  // Missing means collection in the salon.
  delivery?: DeliveryAddress;
  canCancel: boolean;
};

export type ManageOrderResult =
  | { ok: true; order: OrderSummary }
  | { ok: false; error: string };

const refSchema = z
  .string()
  .max(40)
  .transform((ref) => normalizeRef(ref, "TLO"))
  .pipe(z.string().regex(ORDER_REF_RE));

const manageSchema = z.union([
  z.object({ ref: refSchema, token: z.string().min(20).max(100) }),
  z.object({ ref: refSchema, email: z.string().trim().min(3).max(200) }),
]);

export type ManageOrderCredentials =
  | { ref: string; token: string }
  | { ref: string; email: string };

// Same message for an unknown ref and a wrong token or email, so refs can't
// be probed.
const NOT_FOUND_LINK = "We couldn't find that order. Please check your link.";
const NOT_FOUND_EMAIL =
  "We couldn't find an order with those details. Check the reference and use the email you ordered with.";

function notFound(raw: unknown): string {
  return typeof raw === "object" && raw !== null && "email" in raw
    ? NOT_FOUND_EMAIL
    : NOT_FOUND_LINK;
}

async function authorise(repo: OrderRepository, raw: unknown) {
  const parsed = manageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const credentials = parsed.data;
  const order = await repo.getOrderByRef(credentials.ref);
  if (!order) return null;
  const allowed =
    "token" in credentials
      ? tokenMatches(credentials.token, order.cancelTokenHash)
      : // Older orders without an email can only use their link.
        order.client.email !== undefined &&
        sameEmail(credentials.email, order.client.email);
  return allowed ? order : null;
}

export async function findManagedOrder(
  repo: OrderRepository,
  raw: unknown,
): Promise<ManageOrderResult> {
  const order = await authorise(repo, raw);
  if (!order) return { ok: false, error: notFound(raw) };
  return {
    ok: true,
    order: {
      ref: order.ref,
      items: order.items,
      totalPence: order.totalPence,
      status: order.status,
      clientName: order.client.name,
      delivery: order.delivery,
      canCancel: canCustomerCancel(order),
    },
  };
}

export async function cancelManagedOrder(
  repo: OrderRepository,
  raw: unknown,
  now: Date,
): Promise<ManageOrderResult> {
  const order = await authorise(repo, raw);
  if (!order) return { ok: false, error: notFound(raw) };
  if (!canCustomerCancel(order)) {
    return {
      ok: false,
      error: "This order can no longer be cancelled online. Please contact us.",
    };
  }
  const result = await repo.updateOrderStatus(order.id, "cancelled", now);
  if (!result.ok) return { ok: false, error: "This order can't be cancelled." };
  return findManagedOrder(repo, raw);
}
