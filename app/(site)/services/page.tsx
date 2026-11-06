import { Moon } from "lucide-react";
import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { BookCta } from "@/components/site/book-cta";
import { PageIntro } from "@/components/site/page-intro";
import { ServiceRow } from "@/components/site/service-row";
import { getPriceListRules, getServiceCatalogue } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Services & prices",
  description:
    "Locs, retwists, braids, ponytails and hair treatments. Durations and prices, and online booking.",
};

export default async function ServicesPage() {
  const [groups, { depositPence, premiumFrom }] = await Promise.all([
    getServiceCatalogue(),
    getPriceListRules(),
  ]);
  const hasPremium =
    premiumFrom !== null &&
    groups.some((g) => g.services.some((s) => s.premiumPricePence !== undefined));

  return (
    <main className="flex flex-col">
      <PageIntro title="Services & *prices*">
        Prices are a starting point and depend on length and density. Every
        appointment includes the time your hair needs.
      </PageIntro>

      {hasPremium && (
        <div className="px-4 pb-12 sm:px-6">
          <div className="mx-auto flex max-w-6xl gap-3 border-l-2 border-accent bg-accent/10 px-4 py-4 sm:px-6">
            <Moon aria-hidden className="mt-1 size-5 shrink-0 text-accent-ink" />
            <div className="max-w-prose">
              <h2 className="font-display text-2xl font-semibold">
                Premium times
              </h2>
              <p className="mt-1 text-muted">
                Appointments starting at {premiumFrom} or later, or after
                midnight, are premium times. Some services cost a little more
                then: their premium price is shown below, and again next to the
                time when you book.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-16 px-4 pb-24 sm:px-6 sm:gap-20">
        {groups.length === 0 ? (
          <p className="mx-auto w-full max-w-6xl text-muted">
            Services will be listed here soon.
          </p>
        ) : (
          groups.map((category) => (
            <section
              key={category.id}
              className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1fr_3fr] md:gap-16"
            >
              {groups.length > 1 && (
                <h2 className="self-start font-display text-3xl font-semibold text-accent-ink md:sticky md:top-24 md:pt-8">
                  {category.name}
                </h2>
              )}
              <Reveal
                stagger
                className={`border-t border-line ${groups.length > 1 ? "" : "md:col-span-2"}`}
              >
                {category.services.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    depositPence={depositPence}
                    premiumFrom={premiumFrom}
                  />
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
