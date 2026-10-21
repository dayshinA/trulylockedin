import type { Order, OrderItem, OrderStatus } from "@/types/shop";
import type { OrderRepository } from "./order-repository";

// Order rules shared by the public pages, the admin and the repository.

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["ready", "cancelled"],
  ready: ["collected", "cancelled", "pending"],
  collected: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

// Customers can cancel online until the order is being handed over.
export const canCustomerCancel = (order: Pick<Order, "status">) =>
  order.status === "pending";

export const orderTotal = (items: Pick<OrderItem, "pricePence" | "quantity">[]) =>
  items.reduce((sum, item) => sum + item.pricePence * item.quantity, 0);

export const itemCount = (items: Pick<OrderItem, "quantity">[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

// What the customer sees.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Received, being prepared",
  ready: "Ready to collect",
  collected: "Collected",
  cancelled: "Cancelled",
};

// What the owner sees.
export const ORDER_ADMIN_LABELS: Record<OrderStatus, string> = {
  pending: "New",
  ready: "Ready",
  collected: "Collected",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_ACTIONS: Record<OrderStatus, string> = {
  pending: "Back to new",
  ready: "Mark ready to collect",
  collected: "Mark collected",
  cancelled: "Cancel order",
};

// Admin list views.
export const ORDER_VIEWS = ["open", "collected", "cancelled"] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

// How far back the collected and cancelled views reach.
export const ORDER_HISTORY_DAYS = 60;

// Orders for one admin view, newest first. "open" lists new orders before
// those waiting for collection.
export async function loadOrderList(
  repo: Pick<OrderRepository, "listOrders">,
  view: OrderView,
  now: Date,
): Promise<Order[]> {
  if (view !== "open") {
    const since = new Date(now.getTime() - ORDER_HISTORY_DAYS * 86_400_000);
    return (await repo.listOrders({ sinceUtc: since.toISOString() })).filter(
      (o) => o.status === view,
    );
  }
  return (await repo.listOrders({ statuses: ["pending", "ready"] })).sort(
    (a, b) =>
      Number(a.status === "ready") - Number(b.status === "ready") ||
      b.createdAt.localeCompare(a.createdAt),
  );
}
