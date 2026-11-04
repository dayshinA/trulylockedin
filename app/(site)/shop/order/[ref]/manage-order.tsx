"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { OrderSummary } from "@/lib/shop/manage";
import { cancelMyOrder, getMyOrder } from "../../actions";
import { OrderDetails } from "../order-details";

// The token lives in the URL fragment (#t=…), which browsers never send to the
// server or in Referer headers, so it is read here and passed to the action.
function readToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
}

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
    getMyOrder({ ref: orderRef, token: readToken() }).then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", order: result.order }
          : { kind: "error", message: result.error },
      );
    });
    return () => {
      active = false;
    };
  }, [orderRef]);

  async function cancel() {
    const result = await cancelMyOrder({ ref: orderRef, token: readToken() });
    setState((previous) =>
      result.ok
        ? {
            kind: "ready",
            order: result.order,
            message: "Your order has been cancelled.",
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
