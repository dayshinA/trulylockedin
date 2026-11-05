import type {
  DeliveryAddress,
  Order,
  OrderClient,
  OrderPayment,
  OrderStatus,
  PaymentMethod,
} from "@/types/shop";

export type CreateOrderInput = {
  // Quantities per product; names and prices are read from the products.
  lines: { productId: string; quantity: number }[];
  client: OrderClient;
  // Missing means collection in the salon.
  delivery?: DeliveryAddress;
  // "online" creates the order as awaiting_payment until Stripe confirms it.
  paymentMethod: PaymentMethod;
  ref: string;
  cancelTokenHash: string;
  now: Date;
  // The signed-in member placing the order.
  memberId?: string;
};

export type CreateOrderResult =
  | { ok: true; order: Order }
  // Hidden, deleted or out-of-stock products, by id.
  | { ok: false; reason: "unavailable"; productIds: string[] };

// What a completed Stripe payment page reports.
export type OrderPaymentReceived = {
  checkoutSessionId: string;
  paymentIntentId: string;
  amountPence: number;
};

export type ConfirmPaymentResult =
  // This call confirmed it (send the emails).
  | { kind: "confirmed"; order: Order }
  // Already confirmed by this payment (webhook and return page both call).
  | { kind: "already"; order: Order }
  // Nothing is waiting for this payment: refund it.
  | { kind: "refund" };

export type OrderUpdateResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "not_found" | "invalid_transition" };

export interface OrderRepository {
  // Reads the products and writes the order in one transaction, so an order
  // never includes something hidden or sold out at that moment.
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  // The Stripe payment page made for an order awaiting payment.
  attachCheckoutSession(id: string, checkoutSessionId: string): Promise<void>;
  // Atomic; safe to call repeatedly and concurrently for the same payment.
  confirmPayment(
    id: string,
    payment: OrderPaymentReceived,
    now: Date,
  ): Promise<ConfirmPaymentResult>;
  // Deletes an order still awaiting payment. With a session id, only if
  // that's its payment page. Returns the deleted order, or null.
  releaseUnpaid(id: string, checkoutSessionId?: string): Promise<Order | null>;
  updatePayment(id: string, payment: OrderPayment, now: Date): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  getOrderByRef(ref: string): Promise<Order | null>;
  // Newest first. Like listOrdersByMember, never includes orders awaiting
  // payment.
  listOrders(
    filter: { statuses: OrderStatus[] } | { sinceUtc: string },
  ): Promise<Order[]>;
  updateOrderStatus(
    id: string,
    status: OrderStatus,
    now: Date,
  ): Promise<OrderUpdateResult>;
  updateOrderAdminNotes(id: string, notes: string, now: Date): Promise<void>;
  // Every order linked to a member, newest first.
  listOrdersByMember(memberId: string): Promise<Order[]>;
  // Number of orders (any status) per member id.
  countOrdersByMember(): Promise<Map<string, number>>;
  // A deleted member's orders stay as guest orders.
  unlinkMember(memberId: string): Promise<void>;
}
