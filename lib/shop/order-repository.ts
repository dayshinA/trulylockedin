import type { Order, OrderClient, OrderStatus } from "@/types/shop";

export type CreateOrderInput = {
  // Quantities per product; names and prices are read from the products.
  lines: { productId: string; quantity: number }[];
  client: OrderClient;
  ref: string;
  cancelTokenHash: string;
  now: Date;
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
}
