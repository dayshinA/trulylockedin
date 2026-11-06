import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { BookCta } from "@/components/site/book-cta";
import { HomeHero } from "@/components/site/home-hero";
import { ProductGrid } from "@/components/site/product-grid";
import { ServiceList } from "@/components/site/service-list";
import { WorkGallery } from "@/components/site/work-gallery";
import {
  getPublicServices,
  getPublishedProducts,
  getPublishedWork,
  getSiteContent,
} from "@/lib/data/public";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSiteContent();
  return {
    title: { absolute: `${SITE_NAME} | Locs & Hair Studio` },
    description: seo.description,
  };
}

const FEATURED_SERVICES = 3;

export default async function Home() {
  const [content, services, work, products] = await Promise.all([
    getSiteContent(),
    getPublicServices(),
    getPublishedWork(),
    getPublishedProducts(),
  ]);
  // Hidden until the owner features at least one look.
  const featuredWork = work.filter((item) => item.featured).slice(0, 6);
  const featuredProducts = products.filter((p) => p.featured).slice(0, 4);
  const { hero, about, testimonials } = content;
  const featured = services.slice(0, FEATURED_SERVICES);
  const [leadQuote, ...otherQuotes] = testimonials;

  return (
    <main className="flex flex-col">
      <HomeHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        portrait={hero.portrait}
      />

      {featuredWork.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
              <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
                Recent looks
              </SplitHeading>
              <Link
                href="/work"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
              >
                See all work <span aria-hidden className="text-accent">&nbsp;→</span>
              </Link>
            </div>
            <div className="mt-10">
              <WorkGallery items={featuredWork} />
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[2fr_3fr] md:gap-16">
            <div>
              <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
                Services &amp; prices
              </SplitHeading>
              <Reveal>
                <p className="mt-4 max-w-sm text-muted">
                  Tap a service to see available times.
                </p>
                <Link
                  href="/services"
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
                >
                  All services and prices <span aria-hidden className="text-accent">&nbsp;→</span>
                </Link>
              </Reveal>
            </div>
            <Reveal>
              <ServiceList services={featured} />
            </Reveal>
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
              <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
                Care between visits
              </SplitHeading>
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
              >
                Shop all products <span aria-hidden className="text-accent">&nbsp;→</span>
              </Link>
            </div>
            <div className="mt-10">
              <ProductGrid products={featuredProducts} filter={false} />
            </div>
          </div>
        </section>
      )}

      <section className="surface-burgundy px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
              {about.heading}
            </SplitHeading>
            <Reveal>
              <p className="mt-6 text-lg text-muted">{about.paragraphs[0]}</p>
              <Link
                href="/about"
                className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
              >
                More about us <span aria-hidden className="text-accent">&nbsp;→</span>
              </Link>
            </Reveal>
          </div>
          <Reveal className="self-center">
            <ol className="border-t border-line">
              {about.highlights.map((h, i) => (
                <li
                  key={h.title}
                  className="grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-6"
                >
                  <span className="font-display text-2xl text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold">
                      {h.title}
                    </h3>
                    <p className="mt-1 text-muted">{h.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {leadQuote && (
        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
              From the chair
            </SplitHeading>
            <Reveal>
              <figure className="mt-10 max-w-4xl">
                <blockquote className="font-display text-3xl leading-snug sm:text-5xl">
                  <span className="text-accent">&ldquo;</span>
                  {leadQuote.quote}&rdquo;
                </blockquote>
                <Attribution {...leadQuote} />
              </figure>
            </Reveal>
            {otherQuotes.length > 0 && (
              <Reveal
                stagger
                className="mt-16 grid gap-10 border-t border-line pt-10 md:grid-cols-2 md:gap-16"
              >
                {otherQuotes.map((t, i) => (
                  <figure key={i}>
                    <blockquote className="font-display text-2xl leading-snug">
                      <span className="text-accent">&ldquo;</span>
                      {t.quote}&rdquo;
                    </blockquote>
                    <Attribution {...t} />
                  </figure>
                ))}
              </Reveal>
            )}
          </div>
        </section>
      )}

      <BookCta />
    </main>
  );
}

function Attribution({ name, detail }: { name: string; detail?: string }) {
  return (
    <figcaption className="mt-5 text-sm text-muted">
      {name}
      {detail && <span className="text-accent-ink"> · {detail}</span>}
    </figcaption>
  );
}
