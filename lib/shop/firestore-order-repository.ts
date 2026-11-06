import "server-only";

import {
  FieldValue,
  type DocumentSnapshot,
  type Firestore,
} from "firebase-admin/firestore";

import type { Order, OrderItem, OrderPayment } from "@/types/shop";
import type {
  ConfirmPaymentResult,
  CreateOrderInput,
  CreateOrderResult,
  OrderPaymentReceived,
  OrderRepository,
  OrderUpdateResult,
} from "./order-repository";
import { canTransitionOrder, orderTotal } from "./orders";
import { orderSchema, productIdSchema, productSchema } from "./schemas";

// orders/{id}: Order without id. Products are read from products/{id}.

const stripUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const docId = /^[A-Za-z0-9_-]{1,100}$/;

function parse(snap: DocumentSnapshot): Order {
  return orderSchema.parse({ ...snap.data(), id: snap.id }) as Order;
}

// Unpaid online orders are the customer's business until they pay.
const listed = (order: Order) => order.status !== "awaiting_payment";

const newestFirst = (orders: Order[]) =>
  orders.filter(listed).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export class FirestoreOrderRepository implements OrderRepository {
  constructor(private readonly db: Firestore) {}

  private get col() {
    return this.db.collection("orders");
  }

  createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const ids = input.lines.map((line) => line.productId);
    if (ids.some((id) => !productIdSchema.safeParse(id).success)) {
      return Promise.resolve({
        ok: false,
        reason: "unavailable",
        productIds: ids.filter((id) => !productIdSchema.safeParse(id).success),
      });
    }

    const products = this.db.collection("products");
    const ref = this.col.doc();
    return this.db.runTransaction(async (tx) => {
      const snaps = await tx.getAll(...ids.map((id) => products.doc(id)));
      const items: OrderItem[] = [];
      const unavailable: string[] = [];
      snaps.forEach((snap, i) => {
        const product = snap.exists
          ? productSchema.parse({ ...snap.data(), id: snap.id })
          : null;
        if (!product?.published || !product.inStock) {
          unavailable.push(ids[i]);
          return;
        }
        items.push({
          productId: product.id,
          name: product.name,
          pricePence: product.pricePence,
          quantity: input.lines[i].quantity,
        });
      });
      if (unavailable.length > 0) {
        return { ok: false, reason: "unavailable", productIds: unavailable };
      }

      const now = input.now.toISOString();
      const totalPence = orderTotal(items);
      const online = input.paymentMethod === "online";
      const data: Omit<Order, "id"> = {
        ref: input.ref,
        items,
        totalPence,
        client: input.client,
        delivery: input.delivery,
        paymentMethod: input.paymentMethod,
        payment: online
          ? { amountPence: totalPence, status: "awaiting" }
          : undefined,
        status: online ? "awaiting_payment" : "pending",
        cancelTokenHash: input.cancelTokenHash,
        memberId: input.memberId,
        termsVersion: input.termsVersion,
        createdAt: now,
        updatedAt: now,
      };
      tx.create(ref, stripUndefined(data));
      return { ok: true, order: stripUndefined({ id: ref.id, ...data }) };
    });
  }

  async attachCheckoutSession(id: string, checkoutSessionId: string) {
    if (!docId.test(id)) return;
    await this.col
      .doc(id)
      .update({ "payment.checkoutSessionId": checkoutSessionId });
  }

  confirmPayment(
    id: string,
    received: OrderPaymentReceived,
    now: Date,
  ): Promise<ConfirmPaymentResult> {
    if (!docId.test(id)) return Promise.resolve({ kind: "refund" });
    const ref = this.col.doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { kind: "refund" } as const;
      const order = parse(snap);
      if (order.status !== "awaiting_payment") {
        return order.payment?.paymentIntentId === received.paymentIntentId
          ? ({ kind: "already", order } as const)
          : ({ kind: "refund" } as const);
      }
      const updatedAt = now.toISOString();
      const payment: OrderPayment = {
        ...order.payment,
        amountPence: received.amountPence,
        status: "paid",
        checkoutSessionId: received.checkoutSessionId,
        paymentIntentId: received.paymentIntentId,
        paidAt: updatedAt,
      };
      tx.update(ref, { status: "pending", payment, updatedAt });
      return {
        kind: "confirmed",
        order: { ...order, status: "pending", payment, updatedAt },
      } as const;
    });
  }

  releaseUnpaid(id: string, checkoutSessionId?: string) {
    if (!docId.test(id)) return Promise.resolve(null);
    const ref = this.col.doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const order = parse(snap);
      if (order.status !== "awaiting_payment") return null;
      const sessionId = order.payment?.checkoutSessionId;
      if (checkoutSessionId && sessionId && sessionId !== checkoutSessionId) {
        return null;
      }
      tx.delete(ref);
      return order;
    });
  }

  async updatePayment(id: string, payment: OrderPayment, now: Date) {
    if (!docId.test(id)) return;
    await this.col
      .doc(id)
      .update({ payment: stripUndefined(payment), updatedAt: now.toISOString() });
  }

  async getOrder(id: string) {
    if (!docId.test(id)) return null;
    const snap = await this.col.doc(id).get();
    return snap.exists ? parse(snap) : null;
  }

  async getOrderByRef(ref: string) {
    const result = await this.col.where("ref", "==", ref).limit(1).get();
    return result.empty ? null : parse(result.docs[0]);
  }

  // Single-field queries only, so no composite index is needed.
  async listOrders(
    filter: { statuses: Order["status"][] } | { sinceUtc: string },
  ) {
    const query =
      "statuses" in filter
        ? this.col.where("status", "in", filter.statuses)
        : this.col.where("createdAt", ">=", filter.sinceUtc);
    return newestFirst((await query.get()).docs.map(parse));
  }

  updateOrderStatus(
    id: string,
    status: Order["status"],
    now: Date,
  ): Promise<OrderUpdateResult> {
    if (!docId.test(id)) {
      return Promise.resolve({ ok: false, reason: "not_found" });
    }
    const ref = this.col.doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { ok: false, reason: "not_found" };
      const order = parse(snap);
      if (!canTransitionOrder(order.status, status)) {
        return { ok: false, reason: "invalid_transition" };
      }
      const updatedAt = now.toISOString();
      tx.update(ref, { status, updatedAt });
      return { ok: true, order: { ...order, status, updatedAt } };
    });
  }

  async updateOrderAdminNotes(id: string, notes: string, now: Date) {
    if (!docId.test(id)) return;
    await this.col
      .doc(id)
      .update({ adminNotes: notes, updatedAt: now.toISOString() });
  }

  // Equality only, so Firestore's automatic index covers it.
  async listOrdersByMember(memberId: string) {
    const snap = await this.col.where("memberId", "==", memberId).get();
    return newestFirst(snap.docs.map(parse));
  }

  async countOrdersByMember() {
    // "!= null" matches only documents that have the field.
    const snap = await this.col
      .where("memberId", "!=", null)
      .select("memberId")
      .get();
    const counts = new Map<string, number>();
    for (const doc of snap.docs) {
      const memberId = doc.get("memberId");
      if (typeof memberId === "string") {
        counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
      }
    }
    return counts;
  }

  async unlinkMember(memberId: string) {
    const snap = await this.col.where("memberId", "==", memberId).get();
    // A batch takes at most 500 writes.
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = this.db.batch();
      for (const doc of snap.docs.slice(i, i + 500)) {
        batch.update(doc.ref, { memberId: FieldValue.delete() });
      }
      await batch.commit();
    }
  }
}
