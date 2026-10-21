import { z } from "zod";

import { bookingRequestSchema } from "@/lib/booking/request";
import { createCancelToken, createOrderRef, hashToken } from "@/lib/booking/tokens";
import type { RateLimiter } from "@/lib/rate-limit";
import type { OrderItem } from "@/types/shop";
import type { OrderRepository } from "./order-repository";
import { MAX_ORDER_LINES, MAX_QUANTITY, productIdSchema } from "./schemas";

// Framework-free core of the public order Server Action, like
// lib/booking/submit.ts. Prices and availability always come from the stored
// products, never from the browser.

const GENERIC = "Something went wrong. Please try again.";

const lineSchema = z.object({
  productId: productIdSchema,
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

// The same contact fields (and honeypot) as the booking form.
export const orderRequestSchema = bookingRequestSchema
  .pick({ name: true, phone: true, email: true, notes: true, website: true })
  .extend({
    lines: z
      .array(lineSchema)
      .min(1, "Your basket is empty")
      .max(MAX_ORDER_LINES, `At most ${MAX_ORDER_LINES} different products`)
      // The same product twice becomes one line.
      .transform((lines) => {
        const merged = new Map<string, number>();
        for (const { productId, quantity } of lines) {
          merged.set(productId, (merged.get(productId) ?? 0) + quantity);
        }
        return [...merged].map(([productId, quantity]) => ({
          productId,
          quantity: Math.min(quantity, MAX_QUANTITY),
        }));
      }),
  });

export type SubmitOrderResult =
  | {
      ok: true;
      order: { ref: string; items: OrderItem[]; totalPence: number };
      // Only ever returned here; the store keeps its hash.
      cancelToken: string;
    }
  | {
      ok: false;
      error: string;
      // Products that can't be ordered right now (hidden or sold out).
      unavailable?: string[];
      fieldErrors?: Partial<Record<string, string[]>>;
    };

export async function submitOrder(
  repo: OrderRepository,
  raw: unknown,
  context: { now: Date; clientKey: string; limiter: RateLimiter },
): Promise<SubmitOrderResult> {
  // Honeypot first: bots get a dull, uninformative failure.
  if (
    typeof raw === "object" &&
    raw !== null &&
    "website" in raw &&
    typeof raw.website === "string" &&
    raw.website.trim() !== ""
  ) {
    return { ok: false, error: GENERIC };
  }

  if (!context.limiter.hit(context.clientKey, context.now.getTime())) {
    return {
      ok: false,
      error: "Too many orders in a short time. Please try again in a few minutes.",
    };
  }

  const parsed = orderRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      ok: false,
      error: fieldErrors.lines?.[0] ?? "Please check the highlighted details.",
      fieldErrors,
    };
  }
  const { lines, name, phone, email, notes } = parsed.data;

  try {
    const cancelToken = createCancelToken();
    const result = await repo.createOrder({
      lines,
      client: { name, phone, email, notes },
      ref: createOrderRef(),
      cancelTokenHash: hashToken(cancelToken),
      now: context.now,
    });
    if (!result.ok) {
      return {
        ok: false,
        error:
          "Some items are no longer available and have been marked in your basket. Remove them to continue.",
        unavailable: result.productIds,
      };
    }
    const { ref, items, totalPence } = result.order;
    return { ok: true, order: { ref, items, totalPence }, cancelToken };
  } catch (error) {
    console.error("Order failed", error);
    return { ok: false, error: GENERIC };
  }
}
