import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { formatDuration, formatPriceFrom } from "@/lib/format";
import {
  Badge,
  PageHeader,
  primaryButton,
  rowLink,
  rowList,
  rowTitle,
} from "../_components/admin-ui";

export const metadata: Metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  await verifyAdmin();
  const services = await bookingRepository().listServices();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Services"
        actions={
          <Link href="/admin/services/new" className={primaryButton}>
            Add service
          </Link>
        }
      />

      {services.length === 0 ? (
        <p className="text-muted">No services yet.</p>
      ) : (
        <ul className={rowList}>
          {services.map((service) => (
            <li key={service.id}>
              <Link href={`/admin/services/${service.id}`} className={rowLink}>
                <span className="min-w-0 flex-1">
                  <span className={rowTitle}>{service.name}</span>
                  <span className="block text-sm text-muted">
                    {formatDuration(service.durationMin)} ·{" "}
                    {formatPriceFrom(service.priceFromPence)}
                  </span>
                </span>
                {!service.active && <Badge tone="muted">Hidden</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
