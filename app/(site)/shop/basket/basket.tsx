"use client";

import { CldImage } from "next-cloudinary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DetailRows } from "@/components/site/detail-rows";
import { OrderLines } from "@/components/site/order-lines";
import { QuantityStepper } from "@/components/site/quantity-stepper";
import { ShopNotes } from "@/components/site/shop-notes";
import { formatPrice } from "@/lib/format";
import {
  clearBasket,
  removeFromBasket,
  setBasketQuantity,
  useBasket,
} from "@/lib/shop/basket";
import type { OrderItem } from "@/types/shop";
import { placeOrder } from "../actions";

export type BasketProduct = {
  id: string;
  name: string;
  pricePence: number;
  inStock: boolean;
  coverPublicId?: string;
};

type FieldErrors = Partial<Record<string, string[]>>;

const inputClass =
  "min-h-12 w-full rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand";

type Placed = {
  ref: string;
  items: OrderItem[];
  totalPence: number;
  manageUrl: string;
};

export function Basket({
  products,
  notes,
}: {
  products: BasketProduct[];
  notes: string[];
}) {
  const router = useRouter();
  const lines = useBasket();
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [submitting, startSubmit] = useTransition();

  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = lines.map((line) => {
    const product = byId.get(line.productId);
    return {
      ...line,
      product,
      available: !!product?.inStock && !unavailable.includes(line.productId),
    };
  });
  const blocked = rows.some((r) => !r.available);
  const total = rows.reduce(
    (sum, r) => sum + (r.available ? r.product!.pricePence * r.quantity : 0),
    0,
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFormError(null);
    setFieldErrors({});
    startSubmit(async () => {
      const result = await placeOrder({
        lines: lines.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        notes: form.get("notes"),
        website: form.get("website"),
      });
      if (result.ok) {
        const { order, cancelToken } = result;
        setPlaced({
          ...order,
          manageUrl: `/shop/order/${order.ref}#t=${cancelToken}`,
        });
        clearBasket();
        return;
      }
      setFormError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      if (result.unavailable) {
        setUnavailable(result.unavailable);
        // Fresh stock and prices for the list.
        router.refresh();
      }
    });
  }

  if (placed) {
    return (
      <section aria-labelledby="order-received" className="mt-10 max-w-2xl">
        <h2
          id="order-received"
          className="font-display text-4xl font-semibold sm:text-5xl"
        >
          Order received
        </h2>
        <p className="mt-3 text-lg text-muted">
          We&rsquo;ll get it ready and let you know when you can collect it. You
          pay when you collect.
        </p>
        <div className="mt-8">
          <OrderLines
            items={placed.items}
            totalLabel="Total to pay on collection"
            totalPence={placed.totalPence}
          />
        </div>
        <div className="mt-6">
          <DetailRows
            rows={[
              [
                "Reference",
                <span key="ref" className="font-mono">
                  {placed.ref}
                </span>,
              ],
            ]}
          />
        </div>
        <p className="mt-8 text-muted">
          Save or bookmark this link to check or cancel your order. It&rsquo;s
          private to you.
        </p>
        <Link
          href={placed.manageUrl}
          className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand px-8 text-sm font-semibold tracking-widest text-on-brand uppercase transition-colors hover:bg-brand-hover"
        >
          View my order
        </Link>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-xl border-t border-line pt-6">
        <p className="text-lg">Your basket is empty.</p>
        <Link
          href="/shop"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Browse the shop <span aria-hidden>&nbsp;→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16">
      <div className="flex flex-col gap-8">
        <ul className="border-t border-line">
          {rows.map(({ productId, quantity, product, available }) => (
            <li
              key={productId}
              className="flex gap-4 border-b border-line py-5 sm:gap-6"
            >
              {product?.coverPublicId ? (
                <CldImage
                  src={product.coverPublicId}
                  width={192}
                  height={192}
                  crop="fill"
                  alt=""
                  className="size-20 shrink-0 rounded-sm object-cover sm:size-24"
                />
              ) : (
                <span className="size-20 shrink-0 rounded-sm bg-surface sm:size-24" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  {product ? (
                    <Link
                      href={`/shop/${productId}`}
                      className="min-w-0 truncate font-display text-xl font-semibold transition-colors hover:text-brand-hover sm:text-2xl"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    <p className="font-display text-xl font-semibold sm:text-2xl">
                      No longer available
                    </p>
                  )}
                  {available && (
                    <p className="shrink-0 text-brand">
                      {formatPrice(product!.pricePence * quantity)}
                    </p>
                  )}
                </div>
                {!available && (
                  <p className="text-sm font-semibold text-brand">
                    {product ? "Sold out — please remove" : "Please remove"}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  {available && (
                    <QuantityStepper
                      value={quantity}
                      onChange={(next) => setBasketQuantity(productId, next)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromBasket(productId)}
                    className="min-h-11 px-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between text-lg">
          <span>Total, paid on collection</span>
          <span className="font-semibold text-brand">{formatPrice(total)}</span>
        </div>

        <ShopNotes notes={notes} />
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start"
        noValidate
      >
        <h2 className="font-display text-3xl font-semibold">Your details</h2>
        <Field label="Name" error={fieldErrors.name}>
          <input name="name" autoComplete="name" className={inputClass} />
        </Field>
        <Field label="Phone" error={fieldErrors.phone}>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="07700 900123"
            className={inputClass}
          />
        </Field>
        <Field label="Email (optional)" error={fieldErrors.email}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={inputClass}
          />
        </Field>
        <Field
          label="Anything we should know? (optional)"
          error={fieldErrors.notes}
        >
          <textarea name="notes" rows={3} className={`${inputClass} py-2`} />
        </Field>

        {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
        <div
          aria-hidden
          className="absolute -left-[9999px] h-0 overflow-hidden"
        >
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {formError && (
          <p role="alert" className="text-sm font-semibold text-brand">
            {formError}
          </p>
        )}
        {blocked && (
          <p className="text-sm font-semibold text-brand">
            Remove the unavailable items to place your order.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || blocked}
          className="min-h-12 rounded-full bg-brand px-8 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted"
        >
          {submitting ? "Placing order…" : "Place order · pay on collection"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {error?.[0] && <span className="font-semibold text-brand">{error[0]}</span>}
    </label>
  );
}
