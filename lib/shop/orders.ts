import type { Order, OrderItem, OrderStatus } from "@/types/shop";
import type { OrderRepository } from "./order-repository";

// Order rules shared by the public pages, the admin and the repository.

// awaiting_payment only changes through the Stripe payment
// (FirestoreOrderRepository.confirmPayment / releaseUnpaid).
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: [],
  pending: ["ready", "cancelled"],
  ready: ["collected", "cancelled", "pending"],
  collected: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

// Customers can cancel online until the order is ready or posted.
export const canCustomerCancel = (order: Pick<Order, "status">) =>
  order.status === "pending";

export const orderTotal = (items: Pick<OrderItem, "pricePence" | "quantity">[]) =>
  items.reduce((sum, item) => sum + item.pricePence * item.quantity, 0);

export const itemCount = (items: Pick<OrderItem, "quantity">[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

// The statuses are shared, but "ready" and "collected" read differently for an
// order that is posted. Pass the order (or anything with its `delivery`).
type Fulfilled = Pick<Order, "delivery">;
const posted = (order: Fulfilled) => order.delivery !== undefined;

const CUSTOMER_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Waiting for payment",
  pending: "Received, being prepared",
  ready: "Ready to collect",
  collected: "Collected",
  cancelled: "Cancelled",
};
const CUSTOMER_DELIVERY_LABELS: Record<OrderStatus, string> = {
  ...CUSTOMER_LABELS,
  ready: "Posted",
  collected: "Delivered",
};

const ADMIN_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "New",
  ready: "Ready",
  collected: "Collected",
  cancelled: "Cancelled",
};
const ADMIN_DELIVERY_LABELS: Record<OrderStatus, string> = {
  ...ADMIN_LABELS,
  ready: "Posted",
  collected: "Delivered",
};

const ACTIONS: Record<OrderStatus, string> = {
  awaiting_payment: "Await payment",
  pending: "Back to new",
  ready: "Mark ready to collect",
  collected: "Mark collected",
  cancelled: "Cancel order",
};
const DELIVERY_ACTIONS: Record<OrderStatus, string> = {
  ...ACTIONS,
  ready: "Mark posted",
  collected: "Mark delivered",
};

// What the customer sees.
export const orderStatusLabel = (order: Fulfilled & Pick<Order, "status">) =>
  (posted(order) ? CUSTOMER_DELIVERY_LABELS : CUSTOMER_LABELS)[order.status];

// What the owner sees.
export const orderAdminLabel = (order: Fulfilled & Pick<Order, "status">) =>
  (posted(order) ? ADMIN_DELIVERY_LABELS : ADMIN_LABELS)[order.status];

// The owner's button that moves the order to `status`.
export const orderStatusAction = (order: Fulfilled, status: OrderStatus) =>
  (posted(order) ? DELIVERY_ACTIONS : ACTIONS)[status];

export const fulfilmentLabel = (order: Fulfilled) =>
  posted(order) ? "Delivery" : "Collection";

// Paid online (and not refunded): what a refund would give back.
export const refundablePence = (order: Pick<Order, "payment">) =>
  order.payment?.status === "paid" || order.payment?.status === "refund_failed"
    ? order.payment.amountPence
    : 0;

// One line on how the order is paid, for the customer and the owner.
export function paymentLabel(order: Pick<Order, "payment" | "paymentMethod">) {
  const payment = order.payment;
  if (!payment) return "Pay in the salon when you collect";
  switch (payment.status) {
    case "awaiting":
      return "Online payment not completed";
    case "paid":
      return "Paid online";
    case "refunded":
      return "Paid online, refunded";
    case "refund_failed":
      return "Paid online, refund in progress";
  }
}

// Admin list views. "collected" holds delivered orders too.
export const ORDER_VIEWS = ["open", "collected", "cancelled"] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

// How far back the completed and cancelled views reach.
export const ORDER_HISTORY_DAYS = 60;

// Orders for one admin view, newest first. "open" lists new orders before
// those waiting for collection or already posted.
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
