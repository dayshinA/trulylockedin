import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { hasPremiumPrice } from "@/lib/booking/quote";
import {
  formatDuration,
  formatPriceFrom,
  formatServicePrice,
} from "@/lib/format";
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
import { PageGuide } from "../_components/help";

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

      <PageGuide
        id="services"
      >
          <li>
            This is your price list. Everything here appears on the
            website&rsquo;s Services page and is what clients choose from when
            they book.
          </li>
          <li>
            Services are grouped under <strong>categories</strong> (the
            headings, like &ldquo;Locs&rdquo; or &ldquo;Braids&rdquo;). Tap{" "}
            <strong>Categories</strong> to rename, reorder or add them.
          </li>
          <li>
            Tap a service to change its price, how long it takes, its options
            (e.g. loc count) or its photo. Changes go live as soon as you save.
          </li>
          <li>
            The labels on the right explain anything unusual.{" "}
            <strong>Hidden</strong>: clients can&rsquo;t see it.{" "}
            <strong>Not online</strong>: listed, but clients contact you to
            book. <strong>No duration</strong>: it can&rsquo;t be booked
            online until you add one. <strong>No deposit</strong>: clients
            don&rsquo;t pay a deposit for it.
          </li>
          <li>
            The length matters: the website uses it to work out which times
            are free, so make it how long the appointment really takes.
          </li>
      </PageGuide>

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
                            {formatServicePrice(service)}
                            {hasPremiumPrice(service) &&
                              ` · premium ${formatPriceFrom(service.premiumPricePence!).toLowerCase()}`}
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
