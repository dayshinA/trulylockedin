"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { verifyAdmin } from "@/lib/auth/dal";
import { orderStatusSchema } from "@/lib/shop/schemas";
import { orderRepository } from "@/lib/shop/server";

const statusInput = z.object({
  id: z.string().min(1).max(100),
  status: orderStatusSchema,
});

// Invalid transitions are refused by the repository (canTransitionOrder).
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
  if (!result.ok) console.warn("Order status change refused", id, status, result.reason);
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
