import type { Metadata } from "next";
import Link from "next/link";

import { CldImage } from "@/components/media/cld";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { BookCta } from "@/components/site/book-cta";
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
      <section className="px-4 pt-28 pb-20 sm:px-6 lg:pt-32 lg:pb-28">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:min-h-[calc(100svh-15rem)] lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            {hero.eyebrow && (
              <p className="mb-5 text-xs font-semibold tracking-[0.35em] text-brand uppercase">
                {hero.eyebrow}
              </p>
            )}
            <SplitHeading
              as="h1"
              className="font-display text-6xl leading-[0.95] font-semibold sm:text-7xl lg:text-8xl"
            >
              {hero.title}
            </SplitHeading>
            <Reveal delay={0.4}>
              {hero.subtitle && (
                <p className="mt-6 max-w-lg text-lg text-muted">
                  {hero.subtitle}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex min-h-12 items-center rounded-full bg-brand px-8 text-sm font-semibold tracking-widest text-on-brand uppercase transition-colors hover:bg-brand-hover"
                >
                  Book an appointment
                </Link>
                <Link
                  href="/services"
                  className="inline-flex min-h-12 items-center rounded-full border border-brand px-8 text-sm font-semibold tracking-widest text-ink uppercase transition-colors hover:border-brand hover:text-brand"
                >
                  Services
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="relative h-[26rem] overflow-hidden rounded-sm bg-brand sm:h-[32rem] lg:h-full lg:min-h-[34rem]">
            {hero.image && (
              <CldImage
                src={hero.image.publicId}
                alt={hero.image.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                preload
                className="object-cover"
              />
            )}
          </div>
        </div>
      </section>

      {featuredWork.length > 0 && (
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
              <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
                Recent looks
              </SplitHeading>
              <Link
                href="/work"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                See all work <span aria-hidden>&nbsp;→</span>
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
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
                >
                  All services and prices <span aria-hidden>&nbsp;→</span>
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
                className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                Shop all products <span aria-hidden>&nbsp;→</span>
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
                className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                More about us <span aria-hidden>&nbsp;→</span>
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
                  <span className="font-display text-2xl text-brand">
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
                  &ldquo;{leadQuote.quote}&rdquo;
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
                      &ldquo;{t.quote}&rdquo;
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
      {detail && <span className="text-brand"> · {detail}</span>}
    </figcaption>
  );
}
