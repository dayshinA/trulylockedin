"use client";

import { CldImage } from "next-cloudinary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { AddressBlock } from "@/components/site/address-block";
import { CopyButton } from "@/components/site/copy-button";
import { DetailRows } from "@/components/site/detail-rows";
import { Field, FormAlert, inputClass } from "@/components/site/form-field";
import { useErrorFocus } from "@/lib/use-error-focus";
import { MemberBar } from "@/components/site/member-bar";
import { OrderLines } from "@/components/site/order-lines";
import { QuantityStepper } from "@/components/site/quantity-stepper";
import { ShopNotes } from "@/components/site/shop-notes";
import { TermsConsent } from "@/components/site/terms-consent";
import {
  saveBookingAccess,
  settleBookingAccess,
  unsettledBookings,
} from "@/lib/checkout-access";
import { formatPrice } from "@/lib/format";
import {
  clearBasket,
  removeFromBasket,
  setBasketQuantity,
  useBasket,
} from "@/lib/shop/basket";
import type { MemberProfile } from "@/types/member";
import type { DeliveryAddress, OrderItem, PaymentMethod } from "@/types/shop";
import { abandonOrderPayment, placeOrder } from "../actions";

export type BasketProduct = {
  id: string;
  name: string;
  pricePence: number;
  inStock: boolean;
  coverPublicId?: string;
};

type FieldErrors = Partial<Record<string, string[]>>;

type Fulfilment = "collection" | "delivery";

type Placed = {
  ref: string;
  items: OrderItem[];
  totalPence: number;
  delivery?: DeliveryAddress;
  manageUrl: string;
};

const FULFILMENT_CHOICES: { value: Fulfilment; title: string; hint: string }[] =
  [
    {
      value: "collection",
      title: "Collect from the salon",
      hint: "Pay online now, or when you collect",
    },
    {
      value: "delivery",
      title: "Deliver to me",
      hint: "Free UK delivery, paid online",
    },
  ];

const PAYMENT_CHOICES: { value: PaymentMethod; title: string; hint: string }[] =
  [
    {
      value: "online",
      title: "Pay online now",
      hint: "Card, Apple Pay or Google Pay",
    },
    {
      value: "in_store",
      title: "Pay when you collect",
      hint: "In the salon",
    },
  ];

const radioCard =
  "flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border border-field px-4 py-3 transition-colors hover:bg-brand/5 has-checked:border-brand has-checked:bg-brand/5";

export function Basket({
  products,
  notes,
  member,
}: {
  products: BasketProduct[];
  notes: string[];
  member: MemberProfile | null;
}) {
  const router = useRouter();
  const lines = useBasket();
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  useErrorFocus(formRef, fieldErrors);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [fulfilment, setFulfilment] = useState<Fulfilment>("collection");
  const delivering = fulfilment === "delivery";
  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod>("online");
  // Delivery is always paid online.
  const payOnline = delivering || paymentChoice === "online";
  const [submitting, startSubmit] = useTransition();
  // Stays true while the browser leaves for Stripe's payment page.
  const [redirecting, setRedirecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Back from Stripe without paying (its cancel link, ?unpaid=ref, or the
  // browser's Back button): drop the unpaid order. The basket is still here.
  useEffect(() => {
    function releaseUnpaid(announce: boolean) {
      for (const held of unsettledBookings("TLO-")) {
        settleBookingAccess(held.ref);
        void abandonOrderPayment(held).then(({ outcome }) => {
          if (outcome === "paid") {
            router.push(`/shop/order/${encodeURIComponent(held.ref)}`);
          } else if (announce) {
            setNotice(
              "Payment not completed, so your order wasn't placed. Your basket is still here.",
            );
          }
        });
      }
    }
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      setRedirecting(false);
      releaseUnpaid(true);
    }
    releaseUnpaid(new URLSearchParams(window.location.search).has("unpaid"));
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

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
        fulfilment,
        payment: payOnline ? "online" : "in_store",
        addressLine1: form.get("addressLine1"),
        addressLine2: form.get("addressLine2"),
        city: form.get("city"),
        postcode: form.get("postcode"),
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        notes: form.get("notes"),
        acceptTerms: form.get("acceptTerms") === "on",
        website: form.get("website"),
      });
      if (result.ok) {
        const { order, cancelToken, checkoutUrl } = result;
        if (checkoutUrl) {
          // The basket stays until the payment goes through.
          saveBookingAccess(order.ref, { token: cancelToken, photos: 0 });
          setRedirecting(true);
          window.location.assign(checkoutUrl);
          return;
        }
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
          {placed.delivery
            ? "We’ll get it ready and let you know when it’s posted."
            : "We’ll get it ready and let you know when you can collect it. You pay when you collect."}
        </p>
        <div className="mt-8">
          <OrderLines
            items={placed.items}
            totalLabel={
              placed.delivery
                ? "Total, free delivery"
                : "Total to pay on collection"
            }
            totalPence={placed.totalPence}
          />
        </div>
        <div className="mt-6">
          <DetailRows
            rows={[
              placed.delivery
                ? [
                    "Delivery to",
                    <AddressBlock key="address" address={placed.delivery} />,
                  ]
                : ["Collection", "From the salon"],
            ]}
          />
        </div>
        <div className="mt-8 border-l-2 border-accent pl-4">
          <p className="text-sm text-muted">Your order reference</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-2xl font-semibold tracking-wider">
              {placed.ref}
            </span>
            <CopyButton text={placed.ref} />
          </p>
          <p className="mt-2 text-sm text-muted">
            Keep this safe. With the email you ordered with, you can check your
            order any time on{" "}
            <Link
              href="/shop/order/find"
              className="text-brand underline underline-offset-4 hover:text-brand-hover"
            >
              Find my order
            </Link>
            .
          </p>
        </div>
        <p className="mt-8 text-muted">
          Or save this private link to check or cancel your order.
        </p>
        <Link
          href={placed.manageUrl}
          className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand px-8 text-sm font-semibold tracking-widest text-on-brand uppercase transition-colors hover:bg-brand-hover"
        >
          View my order
        </Link>
        {member && (
          <p className="mt-6 text-muted">
            It&rsquo;s also saved in{" "}
            <Link
              href="/account"
              className="text-brand underline underline-offset-4 hover:text-brand-hover"
            >
              your account
            </Link>
            .
          </p>
        )}
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-xl border-t border-line pt-6">
        <p className="text-lg">Your basket is empty.</p>
        <Link
          href="/shop"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
        >
          Browse the shop <span aria-hidden className="text-accent">&nbsp;→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16">
      <div className="flex flex-col gap-8">
        {notice && (
          <p
            role="status"
            className="border-l-2 border-accent pl-4 font-semibold text-brand"
          >
            {notice}
          </p>
        )}
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
                    className="min-h-11 px-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline pointer-coarse:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between text-lg">
          <span>
            {delivering
              ? "Total, free delivery"
              : payOnline
                ? "Total"
                : "Total, paid on collection"}
          </span>
          <span className="font-semibold text-brand">{formatPrice(total)}</span>
        </div>

        <ShopNotes notes={notes} />
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-3xl font-semibold">Your details</h2>
        <MemberBar member={member} purpose="order" />
        {/* Keyed so a sign-in (or sign-out) mid-checkout refills the fields. */}
        <form
          key={member?.email ?? "guest"}
          ref={formRef}
          onSubmit={submit}
          className="flex flex-col gap-5"
          noValidate
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm text-muted">
              How would you like to get it?
            </legend>
            {FULFILMENT_CHOICES.map((choice) => (
              <label key={choice.value} className={radioCard}>
                <input
                  type="radio"
                  name="fulfilment"
                  value={choice.value}
                  checked={fulfilment === choice.value}
                  onChange={() => setFulfilment(choice.value)}
                  className="size-4 accent-brand"
                />
                <span className="flex flex-col">
                  <span className="font-semibold">{choice.title}</span>
                  <span className="text-sm text-muted">{choice.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {!delivering && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm text-muted">
                How would you like to pay?
              </legend>
              {PAYMENT_CHOICES.map((choice) => (
                <label key={choice.value} className={radioCard}>
                  <input
                    type="radio"
                    name="payment"
                    value={choice.value}
                    checked={paymentChoice === choice.value}
                    onChange={() => setPaymentChoice(choice.value)}
                    className="size-4 accent-brand"
                  />
                  <span className="flex flex-col">
                    <span className="font-semibold">{choice.title}</span>
                    <span className="text-sm text-muted">{choice.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <Field label="Name" error={fieldErrors.name}>
            <input
              name="name"
              defaultValue={member?.name}
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field
            label="Phone"
            hint="Preferably a number on WhatsApp, so we have another way to reach you."
            error={fieldErrors.phone}
          >
            <input
              name="phone"
              type="tel"
              defaultValue={member?.phone}
              autoComplete="tel"
              inputMode="tel"
              placeholder="07700 900123"
              className={inputClass}
            />
          </Field>
          <Field
            label="Email"
            hint="With your order reference, this lets you check your order later."
            error={fieldErrors.email}
          >
            <input
              name="email"
              type="email"
              defaultValue={member?.email}
              autoComplete="email"
              inputMode="email"
              required
              className={inputClass}
            />
          </Field>
          {delivering && (
            <fieldset className="flex flex-col gap-5">
              <legend className="mb-5 font-display text-2xl font-semibold">
                Delivery address
              </legend>
              <Field label="Address line 1" error={fieldErrors.addressLine1}>
                <input
                  name="addressLine1"
                  autoComplete="address-line1"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Address line 2 (optional)"
                error={fieldErrors.addressLine2}
              >
                <input
                  name="addressLine2"
                  autoComplete="address-line2"
                  className={inputClass}
                />
              </Field>
              <Field label="Town or city" error={fieldErrors.city}>
                <input
                  name="city"
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Postcode"
                hint="We deliver free to UK addresses only."
                error={fieldErrors.postcode}
              >
                <input
                  name="postcode"
                  autoComplete="postal-code"
                  autoCapitalize="characters"
                  className={`${inputClass} uppercase`}
                />
              </Field>
            </fieldset>
          )}

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

          <TermsConsent error={fieldErrors.acceptTerms}>
            , including returns,
          </TermsConsent>

          {formError && <FormAlert>{formError}</FormAlert>}
          {payOnline && (
            <p className="text-sm text-muted">
              Next you&rsquo;ll pay {formatPrice(total)} on our secure payment
              page. Your order is placed once the payment goes through.
            </p>
          )}
          {blocked && (
            <p className="text-sm font-semibold text-brand">
              Remove the unavailable items to place your order.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || blocked || redirecting}
            className="min-h-12 rounded-full bg-brand px-8 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted"
          >
            {redirecting
              ? "Opening payment…"
              : submitting
                ? "Placing order…"
                : payOnline
                  ? `Pay ${formatPrice(total)}`
                  : "Place order · pay on collection"}
          </button>
        </form>
      </div>
    </div>
  );
}
