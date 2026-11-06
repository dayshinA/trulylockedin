import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { formatDuration, formatPriceFrom } from "@/lib/format";
import {
  Badge,
  outlineButton,
  PageHeader,
  primaryButton,
  rowLink,
  rowList,
  rowTitle,
  Section,
} from "../_components/admin-ui";

export const metadata: Metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  await verifyAdmin();
  const repo = bookingRepository();
  const [categories, services] = await Promise.all([
    repo.listCategories(),
    repo.listServices(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-12">
      <PageHeader
        title="Services"
        actions={
          <>
            <Link href="/admin/services/categories" className={outlineButton}>
              Categories
            </Link>
            <Link href="/admin/services/new" className={primaryButton}>
              Add service
            </Link>
          </>
        }
      />

      {services.length === 0 ? (
        <p className="text-muted">No services yet.</p>
      ) : (
        categories.map((category) => {
          const list = services.filter((s) => s.categoryId === category.id);
          return (
            <Section
              key={category.id}
              title={category.name}
              count={list.length}
              action={
                !category.visibleOnline && (
                  <Badge tone="muted">Hidden online</Badge>
                )
              }
            >
              {list.length === 0 ? (
                <p className="text-sm text-muted">No services yet.</p>
              ) : (
                <ul className={rowList}>
                  {list.map((service) => (
                    <li key={service.id}>
                      <Link
                        href={`/admin/services/${service.id}`}
                        className={rowLink}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={rowTitle}>{service.name}</span>
                          <span className="block text-sm text-muted">
                            {formatDuration(service.durationMin)} ·{" "}
                            {formatPriceFrom(service.priceFromPence)}
                            {service.premiumPricePence !== undefined &&
                              ` · premium ${formatPriceFrom(service.premiumPricePence).toLowerCase()}`}
                            {service.options.length > 0 &&
                              ` · ${service.options.length} option${service.options.length === 1 ? "" : "s"}`}
                          </span>
                        </span>
                        {service.durationMin === null && (
                          <Badge tone="alert">No duration</Badge>
                        )}
                        {!service.active ? (
                          <Badge tone="muted">Hidden</Badge>
                        ) : (
                          !service.onlineBooking && (
                            <Badge tone="muted">Not online</Badge>
                          )
                        )}
                        {!service.depositRequired && (
                          <Badge tone="muted">No deposit</Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          );
        })
      )}
    </div>
  );
}
