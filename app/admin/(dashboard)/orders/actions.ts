"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { verifyAdmin } from "@/lib/auth/dal";
import { notifyOrder } from "@/lib/email/order-emails";
import { refundOrder } from "@/lib/shop/payment";
import { orderStatusSchema } from "@/lib/shop/schemas";
import { orderRepository } from "@/lib/shop/server";

const statusInput = z.object({
  id: z.string().min(1).max(100),
  status: orderStatusSchema,
});

// Invalid transitions are refused by the repository (canTransitionOrder).
// Cancelling an order paid online refunds it.
export async function setOrderStatusAction(formData: FormData) {
  await verifyAdmin();
  const parsed = statusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { id, status } = parsed.data;
  const result = await orderRepository().updateOrderStatus(
    id,
    status,
    new Date(),
  );
  if (result.ok) {
    if (status === "cancelled") await refundOrder(result.order);
    // Emails read the order afresh, so they include the refund.
    notifyOrder({ kind: "status_changed", id });
  } else {
    console.warn("Order status change refused", id, status, result.reason);
  }
  refresh();
}

// "Refund customer": gives back the whole online payment. The order's status
// is left as it is (cancel it too if nothing will be sent or collected).
// Also retries a refund that failed.
export async function refundOrderAction(formData: FormData) {
  await verifyAdmin();
  const id = z.string().min(1).max(100).safeParse(formData.get("id"));
  if (!id.success) return;
  const order = await orderRepository().getOrder(id.data);
  if (!order) return;
  const payment = await refundOrder(order);
  // A cancelled order's email already covered the refund.
  if (payment?.status === "refunded" && order.status !== "cancelled") {
    notifyOrder({ kind: "refunded", id: order.id });
  }
  refresh();
}

const notesInput = z.object({
  id: z.string().min(1).max(100),
  adminNotes: z.string().trim().max(2000),
});

export async function saveOrderNotesAction(formData: FormData) {
  await verifyAdmin();
  const parsed = notesInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await orderRepository().updateOrderAdminNotes(
    parsed.data.id,
    parsed.data.adminNotes,
    new Date(),
  );
  refresh();
}
