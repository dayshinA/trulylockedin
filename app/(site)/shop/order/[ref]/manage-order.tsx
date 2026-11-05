"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  readBookingAccess,
  settleBookingAccess,
} from "@/lib/checkout-access";
import { clearBasket } from "@/lib/shop/basket";
import type { OrderSummary } from "@/lib/shop/manage";
import {
  cancelMyOrder,
  confirmOrderPaymentReturn,
  getMyOrder,
} from "../../actions";
import { OrderDetails } from "../order-details";

// The token lives in the URL fragment (#t=…), which browsers never send to the
// server or in Referer headers, so it is read here and passed to the action.
// Back from paying online there's no fragment (Stripe must not see the token):
// it waits in sessionStorage, and ?session_id names the payment.
function readToken(orderRef: string): string {
  return (
    new URLSearchParams(window.location.hash.slice(1)).get("t") ??
    readBookingAccess(orderRef)?.token ??
    ""
  );
}

const PAID_NO_LINK =
  "Thank you, your payment went through. We've emailed your order confirmation. To see your order on this device, use Find my order with your reference and email.";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; order: OrderSummary; message?: string };

const linkClass =
  "inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline";

export function ManageOrder({ orderRef }: { orderRef: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    const token = readToken(orderRef);
    const sessionId = new URLSearchParams(window.location.search).get(
      "session_id",
    );
    (async () => {
      if (sessionId) {
        // Confirms the order if Stripe's webhook hasn't yet.
        await confirmOrderPaymentReturn(sessionId);
        clearBasket();
      }
      const result = await getMyOrder({ ref: orderRef, token });
      if (!active) return;
      if (result.ok && result.order.status !== "awaiting_payment") {
        settleBookingAccess(orderRef);
      }
      setState(
        result.ok
          ? {
              kind: "ready",
              order: result.order,
              message:
                sessionId && result.order.payment?.status === "paid"
                  ? "Thank you, your payment went through. We've emailed your confirmation."
                  : sessionId && result.order.status === "awaiting_payment"
                    ? "We're waiting for Stripe to confirm your payment. Refresh this page in a minute."
                    : undefined,
            }
          : {
              kind: "error",
              message: sessionId && !token ? PAID_NO_LINK : result.error,
            },
      );
    })();
    return () => {
      active = false;
    };
  }, [orderRef]);

  async function cancel() {
    const result = await cancelMyOrder({
      ref: orderRef,
      token: readToken(orderRef),
    });
    setState((previous) =>
      result.ok
        ? {
            kind: "ready",
            order: result.order,
            message:
              result.order.payment?.status === "refunded" ||
              result.order.payment?.status === "refund_failed"
                ? "Your order has been cancelled and your payment will be refunded to your card."
                : "Your order has been cancelled.",
          }
        : previous.kind === "ready"
          ? { ...previous, message: result.error }
          : { kind: "error", message: result.error },
    );
  }

  if (state.kind === "loading") {
    return <p className="mt-8 text-muted">Loading your order…</p>;
  }

  if (state.kind === "error") {
    return (
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-lg">{state.message}</p>
        <div className="mt-4 flex flex-wrap gap-x-6">
          <Link href="/shop/order/find" className={linkClass}>
            Find it with your reference and email
          </Link>
          <Link href="/shop" className={linkClass}>
            Go to the shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <OrderDetails
      order={state.order}
      message={state.message}
      onCancel={cancel}
    />
  );
}
