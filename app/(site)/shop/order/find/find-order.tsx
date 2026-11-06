"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import {
  Field,
  FormAlert,
  inputClass,
  primaryButtonClass,
} from "@/components/site/form-field";
import type { OrderSummary } from "@/lib/shop/manage";
import { cancelMyOrder, getMyOrder } from "../../actions";
import { OrderDetails } from "../order-details";
import { useErrorFocus } from "@/lib/use-error-focus";

type Found = {
  credentials: { ref: string; email: string };
  order: OrderSummary;
  message?: string;
};

const linkClass =
  "inline-flex min-h-11 items-center text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline";

// Guests look an order up with its reference and the email they ordered
// with. The server answers the same way for a wrong reference or email.
export function FindOrder() {
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ ref?: string[]; email?: string[] }>({});
  const [searching, startSearch] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useErrorFocus(formRef, missing);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = {
      ref: String(form.get("ref") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
    };
    setError(null);
    setMissing({
      ...(!credentials.ref && { ref: ["Enter your order reference."] }),
      ...(!credentials.email && { email: ["Enter your email address."] }),
    });
    if (!credentials.ref || !credentials.email) return;
    startSearch(async () => {
      const result = await getMyOrder(credentials);
      if (result.ok) setFound({ credentials, order: result.order });
      else setError(result.error);
    });
  }

  async function cancel() {
    if (!found) return;
    const result = await cancelMyOrder(found.credentials);
    setFound(
      result.ok
        ? {
            ...found,
            order: result.order,
            message: "Your order has been cancelled.",
          }
        : { ...found, message: result.error },
    );
  }

  if (found) {
    return (
      <>
        <OrderDetails
          order={found.order}
          message={found.message}
          onCancel={cancel}
        />
        <div className="mt-10 flex flex-wrap gap-x-6 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setFound(null)}
            className={linkClass}
          >
            Look up another order
          </button>
          <Link href="/shop" className={linkClass}>
            Go to the shop
          </Link>
        </div>
      </>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={search}
      className="mt-10 flex flex-col gap-5"
      noValidate
    >
      <Field label="Order reference" hint="For example TLO-7KQ2ABCD"
        error={missing.ref}
      >
        <input
          name="ref"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className={`${inputClass} font-mono uppercase`}
        />
      </Field>
      <Field label="Email you ordered with" error={missing.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className={inputClass}
        />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <button
        type="submit"
        disabled={searching}
        className={`${primaryButtonClass} sm:w-fit`}
      >
        {searching ? "Finding…" : "Find my order"}
      </button>
      <p className="text-sm text-muted">
        Have an account? Orders placed while signed in are listed under{" "}
        <Link
          href="/account"
          className="text-brand underline-offset-4 hover:underline pointer-coarse:underline"
        >
          your account
        </Link>
        .
      </p>
    </form>
  );
}
