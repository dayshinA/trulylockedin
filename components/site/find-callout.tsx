import { Search } from "lucide-react";
import Link from "next/link";

// "Already booked? / Already ordered?" panel on /book and /shop, linking to
// the ref + email lookup pages.
export function FindCallout({
  title,
  text,
  href,
  label,
  className = "",
}: {
  title: string;
  text: string;
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-sm border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand"
        >
          <Search className="size-5" />
        </span>
        <div>
          <p className="font-display text-2xl leading-tight font-semibold">
            {title}
          </p>
          <p className="mt-1 text-sm text-muted">{text}</p>
        </div>
      </div>
      <Link
        href={href}
        // Outline: a side task, so it doesn't compete with the page's main
        // (filled) button.
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-brand bg-page px-8 font-semibold text-brand transition-colors hover:bg-brand hover:text-on-brand"
      >
        {label}
      </Link>
    </div>
  );
}
