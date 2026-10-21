import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// Admin building blocks in the public site's language: hairline dividers
// instead of boxed cards, pill buttons, Cormorant headings with a gold eyebrow.
// No "use client", so server pages and client forms can both use them.

export const primaryButton =
  "inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-espresso transition-colors hover:bg-gold-light disabled:bg-brown disabled:text-sand";

export const outlineButton =
  "inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-caramel px-5 text-sm text-cream transition-colors hover:border-gold hover:text-gold-light disabled:border-brown disabled:text-sand";

export const dangerButton =
  "inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-burgundy px-5 text-sm font-semibold text-cream transition-colors hover:bg-wine disabled:bg-brown disabled:text-sand";

// Compact pill for row actions (move, remove, retry…).
export const smallButton =
  "min-h-11 min-w-11 rounded-full border border-brown px-3 text-xs text-cream transition-colors hover:border-gold hover:text-gold-light disabled:text-caramel disabled:hover:border-brown";

export const textLink =
  "inline-flex min-h-11 w-fit items-center text-sm font-semibold text-gold underline-offset-4 hover:underline";

// A list of rows between hairlines (bookings, orders, services…).
export const rowList = "border-t border-brown";
export const rowLink =
  "group flex min-h-11 items-center gap-4 border-b border-brown py-4 transition-colors";
export const rowTitle =
  "block truncate font-display text-xl font-semibold text-cream transition-colors group-hover:text-gold-light";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">
      {children}
    </p>
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex min-h-11 w-fit items-center gap-2 px-1 text-sm font-semibold text-gold transition-colors hover:text-gold-light"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  back,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4">
      {back && <BackLink href={back.href}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1
            className={`font-display text-4xl leading-[1.05] font-semibold break-words sm:text-5xl ${eyebrow ? "mt-3" : ""}`}
          >
            {title}
          </h1>
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {children && <div className="max-w-xl text-sand">{children}</div>}
    </header>
  );
}

export function Section({
  title,
  count,
  description,
  action,
  children,
}: {
  title: string;
  count?: number;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="flex items-baseline gap-3 font-display text-3xl font-semibold">
            {title}
            {count !== undefined && (
              <span className="font-sans text-sm font-semibold text-gold tabular-nums">
                {count}
              </span>
            )}
          </h2>
          {action}
        </div>
        {description && (
          <p className="mt-1 text-sm text-sand">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export type BadgeTone = "attention" | "accent" | "muted" | "struck" | "alert";

const BADGE_TONES: Record<BadgeTone, string> = {
  attention: "border-gold bg-gold text-espresso",
  accent: "border-gold text-gold",
  muted: "border-brown text-sand",
  struck: "border-brown text-sand line-through",
  alert: "border-burgundy bg-burgundy text-cream",
};

export function Badge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.15em] uppercase ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// Link tabs with a gold underline, like the public gallery's filter.
export function Tabs({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; current: boolean }[];
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 flex gap-8 overflow-x-auto border-b border-brown px-4 sm:mx-0 sm:px-0"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 text-sm transition-colors ${
            item.current
              ? "border-gold text-cream"
              : "border-transparent text-sand hover:text-cream"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Delete section at the bottom of an edit page, closed by default.
export function DangerZone({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-y border-brown text-sm">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 text-sand transition-colors hover:text-cream">
        {summary}
        <span aria-hidden className="text-gold group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="flex flex-col gap-4 pb-6">{children}</div>
    </details>
  );
}

// Label/value rows between hairlines (mirrors the public DetailRows).
export function DetailList({
  rows,
}: {
  rows: [label: string, value: React.ReactNode][];
}) {
  return (
    <dl className="border-t border-brown text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[7rem_1fr] gap-4 border-b border-brown py-3 sm:grid-cols-[9rem_1fr]"
        >
          <dt className="text-sand">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
