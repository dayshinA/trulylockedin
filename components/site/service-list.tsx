import Link from "next/link";

import { formatDuration, formatServicePrice } from "@/lib/format";
import type { Service } from "@/types/booking";

// A salon price list: one row per service, each row books that service.
export function ServiceList({ services }: { services: Service[] }) {
  return (
    <ul className="border-t border-line">
      {services.map((service) => (
        <li key={service.id} className="border-b border-line">
          <Link
            href={`/book?service=${encodeURIComponent(service.id)}`}
            className="group flex min-h-11 items-baseline gap-6 py-6"
          >
            <span className="flex-1">
              <span className="block font-display text-2xl font-semibold text-ink transition-colors group-hover:text-brand-hover sm:text-3xl">
                <span className="sr-only">Book </span>
                {service.name}
              </span>
              <span className="mt-1 block text-sm text-muted">
                {formatDuration(service.durationMin)}
                {service.description && (
                  <span className="hidden sm:inline">
                    {" "}
                    · {service.description}
                  </span>
                )}
              </span>
            </span>
            <span className="shrink-0 font-semibold text-accent-ink">
              {formatServicePrice(service)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
