import { z } from "zod";

import {
  bookingRequestSchema,
  emailSchema,
  phoneSchema,
} from "@/lib/booking/request";
import { createCancelToken, createOrderRef, hashToken } from "@/lib/booking/tokens";
import type { RateLimiter } from "@/lib/rate-limit";
import type { DeliveryAddress, Order, OrderItem, PaymentMethod } from "@/types/shop";
import { deliveryFormSchema } from "./address";
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

// The booking form's name, notes and honeypot. Orders need a phone (collection
// / "ready" messages) and an email (with the ref it finds the order again on
// /shop/order/find).
export const orderRequestSchema = bookingRequestSchema
  .pick({ name: true, notes: true, website: true, acceptTerms: true })
  .extend({
    phone: phoneSchema,
    email: emailSchema,
    fulfilment: z.enum(["collection", "delivery"]).default("collection"),
    // Only collection can be paid in the salon; delivery is always online.
    payment: z.enum(["online", "in_store"]).default("online"),
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
      order: {
        ref: string;
        items: OrderItem[];
        totalPence: number;
        delivery?: DeliveryAddress;
      };
      // Only ever returned here; the store keeps its hash.
      cancelToken: string;
      // Paying online: send the customer to Stripe's payment page. The order
      // waits (awaiting_payment, hidden) until it's paid.
      checkoutUrl?: string;
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
  context: {
    now: Date;
    clientKey: string;
    limiter: RateLimiter;
    // From the member session, never from `raw`.
    memberId?: string;
    // The terms' "Last updated" date, recorded as the version agreed to.
    termsVersion: string;
    // Makes the Stripe payment page for an order paid online.
    startCheckout: (order: Order) => Promise<{ id: string; url: string }>;
  },
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
  // The address is only read for a delivery. Both are checked together so the
  // customer sees every field error at once.
  const wantsDelivery = parsed.success
    ? parsed.data.fulfilment === "delivery"
    : typeof raw === "object" &&
      raw !== null &&
      "fulfilment" in raw &&
      raw.fulfilment === "delivery";
  const address = wantsDelivery ? deliveryFormSchema.safeParse(raw) : null;
  if (!parsed.success || (address && !address.success)) {
    const fieldErrors = {
      ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
      ...(address && !address.success
        ? z.flattenError(address.error).fieldErrors
        : {}),
    };
    return {
      ok: false,
      error: fieldErrors.lines?.[0] ?? "Please check the highlighted details.",
      fieldErrors,
    };
  }
  const { lines, name, phone, email, notes, fulfilment } = parsed.data;
  const paymentMethod: PaymentMethod =
    fulfilment === "delivery" ? "online" : parsed.data.payment;

  try {
    const cancelToken = createCancelToken();
    const result = await repo.createOrder({
      lines,
      client: { name, phone, email, notes },
      delivery: address?.data,
      paymentMethod,
      ref: createOrderRef(),
      cancelTokenHash: hashToken(cancelToken),
      now: context.now,
      memberId: context.memberId,
      termsVersion: context.termsVersion,
    });
    if (!result.ok) {
      return {
        ok: false,
        error:
          "Some items are no longer available and have been marked in your basket. Remove them to continue.",
        unavailable: result.productIds,
      };
    }
    const order = result.order;
    let checkoutUrl: string | undefined;
    if (order.status === "awaiting_payment") {
      try {
        const checkout = await context.startCheckout(order);
        await repo.attachCheckoutSession(order.id, checkout.id);
        checkoutUrl = checkout.url;
      } catch (error) {
        console.error("Order payment page failed", order.id, error);
        await repo
          .releaseUnpaid(order.id)
          .catch((e) => console.error("Unpaid order not released", order.id, e));
        return {
          ok: false,
          error: "We couldn't open the payment page. Please try again in a moment.",
        };
      }
    }
    const { ref, items, totalPence, delivery } = order;
    return {
      ok: true,
      order: { ref, items, totalPence, delivery },
      cancelToken,
      checkoutUrl,
    };
  } catch (error) {
    console.error("Order failed", error);
    return { ok: false, error: GENERIC };
  }
}
