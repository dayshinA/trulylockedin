import Link from "next/link";

import { CldImage } from "@/components/media/cld";
import { depositFor } from "@/lib/booking/deposit-rules";
import {
  formatDuration,
  formatOptionPrice,
  formatPrice,
  formatPriceFrom,
} from "@/lib/format";
import type { Service } from "@/types/booking";

// One entry of the full price list on /services.
export function ServiceRow({
  service,
  depositPence,
}: {
  service: Service;
  depositPence: number;
}) {
  // Without a duration there are no slots to offer, so it's booked by asking.
  const bookable = service.onlineBooking && service.durationMin !== null;
  const deposit = bookable
    ? depositFor(depositPence, service, service.priceFromPence)
    : 0;

  return (
    <article className="flex gap-5 border-b border-line py-8 sm:gap-8">
      {service.imagePublicId && (
        <CldImage
          src={service.imagePublicId}
          width={400}
          height={400}
          crop="fill"
          gravity="auto"
          sizes="(max-width: 640px) 6rem, 10rem"
          // Decorative: the service name follows as the heading.
          alt=""
          className="size-24 shrink-0 rounded-sm object-cover sm:size-40"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl font-semibold sm:text-3xl">
            {service.name}
          </h3>
          <p className="shrink-0 font-semibold text-accent-ink">
            {formatPriceFrom(service.priceFromPence)}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">
          {formatDuration(service.durationMin)}
          {service.priceLabel && ` · ${service.priceLabel}`}
        </p>
        {service.description && (
          <p className="mt-3 max-w-prose text-muted">{service.description}</p>
        )}
        {deposit > 0 && (
          <p className="mt-2 text-sm text-ink">
            {formatPrice(deposit)} deposit to book online
          </p>
        )}
        {service.depositNote && (
          <p className="mt-2 text-sm text-ink">{service.depositNote}</p>
        )}
        {service.options.length > 0 && (
          <ul className="mt-4 max-w-prose border-t border-line text-sm">
            {service.options.map((option) => (
              <li
                key={option.id}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2"
              >
                <span className="text-ink">{option.name}</span>
                <span className="shrink-0 text-muted">
                  {formatOptionPrice(option.pricePence)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={
            bookable
              ? `/book?service=${encodeURIComponent(service.id)}`
              : "/contact"
          }
          className="mt-3 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
        >
          {bookable ? "Book this" : "Get in touch to book"}
          <span className="sr-only">: {service.name}</span>
          <span aria-hidden className="text-accent">&nbsp;→</span>
        </Link>
      </div>
    </article>
  );
}
