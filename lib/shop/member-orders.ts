import type {
  DeliveryAddress,
  Order,
  OrderPayment,
  PaymentMethod,
  OrderItem,
  OrderStatus,
  Product,
} from "@/types/shop";
import type { BasketLine } from "./basket";
import type { OrderRepository } from "./order-repository";
import { canCustomerCancel } from "./orders";

// A signed-in member's own orders on /account. Ownership comes from
// Order.memberId, which only the server sets from the session.

export type MemberOrder = {
  id: string;
  ref: string;
  items: OrderItem[];
  totalPence: number;
  status: OrderStatus;
  delivery?: DeliveryAddress;
  paymentMethod?: PaymentMethod;
  payment?: Pick<OrderPayment, "amountPence" | "status">;
  createdAt: string;
  canCancel: boolean;
  // The items that can still be bought, for "Order again". Prices and stock
  // are re-checked when the new order is placed.
  reorder: BasketLine[];
};

export type MemberOrders = {
  // Being prepared, waiting for collection or posted, newest first.
  open: MemberOrder[];
  // Collected, delivered or cancelled, newest first.
  past: MemberOrder[];
};

const PAST_LIMIT = 20;

export async function loadMemberOrders(
  repo: Pick<OrderRepository, "listOrdersByMember">,
  // Published products, as the shop shows them.
  products: Pick<Product, "id" | "inStock">[],
  memberId: string,
): Promise<MemberOrders> {
  const orders = await repo.listOrdersByMember(memberId);
  const buyable = new Set(products.filter((p) => p.inStock).map((p) => p.id));

  const view = (order: Order): MemberOrder => ({
    id: order.id,
    ref: order.ref,
    items: order.items,
    totalPence: order.totalPence,
    status: order.status,
    delivery: order.delivery,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    payment: order.payment && {
      amountPence: order.payment.amountPence,
      status: order.payment.status,
    },
    canCancel: canCustomerCancel(order),
    reorder: order.items
      .filter((item) => buyable.has(item.productId))
      .map(({ productId, quantity }) => ({ productId, quantity })),
  });

  const isOpen = (o: Order) => o.status === "pending" || o.status === "ready";
  return {
    open: orders.filter(isOpen).map(view),
    past: orders
      .filter((o) => !isOpen(o))
      .slice(0, PAST_LIMIT)
      .map(view),
  };
}

export type CancelMemberOrderResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelMemberOrder(
  repo: OrderRepository,
  memberId: string,
  orderId: string,
  now: Date,
): Promise<CancelMemberOrderResult> {
  const order = await repo.getOrder(orderId);
  // Someone else's order looks the same as a missing one.
  if (!order || order.memberId !== memberId) {
    return { ok: false, error: "We couldn't find that order." };
  }
  if (!canCustomerCancel(order)) {
    return {
      ok: false,
      error: "This order can no longer be cancelled online. Please contact us.",
    };
  }
  const result = await repo.updateOrderStatus(order.id, "cancelled", now);
  return result.ok
    ? { ok: true }
    : { ok: false, error: "This order can't be cancelled." };
}
