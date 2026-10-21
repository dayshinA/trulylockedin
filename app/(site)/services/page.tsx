import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { BookCta } from "@/components/site/book-cta";
import { PageIntro } from "@/components/site/page-intro";
import { ServiceRow } from "@/components/site/service-row";
import { getPublicServices } from "@/lib/data/public";
import type { Service } from "@/types/booking";

export const metadata: Metadata = {
  title: "Services & prices",
  description:
    "Starter locs, retwists, interlocking, extensions and repairs. Durations and prices, and online booking.",
};

// Grouped by category in the order the owner set; uncategorised last.
function groupByCategory(services: Service[]): [string, Service[]][] {
  const groups = new Map<string, Service[]>();
  for (const service of services) {
    const key = service.category ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), service]);
  }
  return [...groups].sort(([a], [b]) =>
    a === "Other" ? 1 : b === "Other" ? -1 : 0,
  );
}

export default async function ServicesPage() {
  const services = await getPublicServices();
  const groups = groupByCategory(services);

  return (
    <main className="flex flex-col">
      <PageIntro title="Services & prices">
        Prices are a starting point and depend on length and density. Every
        appointment includes the time your hair needs.
      </PageIntro>

      <div className="flex flex-col gap-16 px-4 pb-24 sm:px-6 sm:gap-20">
        {services.length === 0 ? (
          <p className="mx-auto w-full max-w-6xl text-sand">
            Services will be listed here soon.
          </p>
        ) : (
          groups.map(([category, list]) => (
            <section
              key={category}
              className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1fr_3fr] md:gap-16"
            >
              {groups.length > 1 && (
                <h2 className="self-start font-display text-3xl font-semibold text-gold md:sticky md:top-24 md:pt-8">
                  {category}
                </h2>
              )}
              <Reveal
                stagger
                className={`border-t border-brown ${groups.length > 1 ? "" : "md:col-span-2"}`}
              >
                {list.map((service) => (
                  <ServiceRow key={service.id} service={service} />
                ))}
              </Reveal>
            </section>
          ))
        )}
      </div>

      <BookCta />
    </main>
  );
}
