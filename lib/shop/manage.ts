import { z } from "zod";

import { ORDER_REF_RE, tokenMatches } from "@/lib/booking/tokens";
import type { DeliveryAddress, OrderItem, OrderStatus } from "@/types/shop";
import type { OrderRepository } from "./order-repository";
import { canCustomerCancel } from "./orders";

// Customer self-service through the link shown after ordering:
// /shop/order/{ref}#t={cancelToken}. The ref alone grants nothing.

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

const manageSchema = z.object({
  ref: z.string().regex(ORDER_REF_RE),
  token: z.string().min(20).max(100),
});

// Same message for an unknown ref and a wrong token, so refs can't be probed.
const NOT_FOUND = "We couldn't find that order. Please check your link.";

async function authorise(repo: OrderRepository, raw: unknown) {
  const parsed = manageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const order = await repo.getOrderByRef(parsed.data.ref);
  if (!order || !tokenMatches(parsed.data.token, order.cancelTokenHash)) {
    return null;
  }
  return order;
}

export async function findManagedOrder(
  repo: OrderRepository,
  raw: unknown,
): Promise<ManageOrderResult> {
  const order = await authorise(repo, raw);
  if (!order) return { ok: false, error: NOT_FOUND };
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
  if (!order) return { ok: false, error: NOT_FOUND };
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
