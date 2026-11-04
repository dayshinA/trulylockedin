import type {
  DeliveryAddress,
  Order,
  OrderClient,
  OrderStatus,
} from "@/types/shop";

export type CreateOrderInput = {
  // Quantities per product; names and prices are read from the products.
  lines: { productId: string; quantity: number }[];
  client: OrderClient;
  // Missing means collection in the salon.
  delivery?: DeliveryAddress;
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

export type OrderUpdateResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "not_found" | "invalid_transition" };

export interface OrderRepository {
  // Reads the products and writes the order in one transaction, so an order
  // never includes something hidden or sold out at that moment.
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  getOrder(id: string): Promise<Order | null>;
  getOrderByRef(ref: string): Promise<Order | null>;
  // Newest first.
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
