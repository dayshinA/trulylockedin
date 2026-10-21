import type { Metadata } from "next";
import Link from "next/link";

import { BookCta } from "@/components/site/book-cta";
import { PageIntro } from "@/components/site/page-intro";
import { ProductGrid } from "@/components/site/product-grid";
import { ShopNotes } from "@/components/site/shop-notes";
import { getPublishedProducts, getSiteContent } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Shop",
  description: "Loc care products and accessories, collected in the salon.",
};

export default async function ShopPage() {
  const [products, { shop }] = await Promise.all([
    getPublishedProducts(),
    getSiteContent(),
  ]);

  return (
    <main className="flex flex-col">
      <PageIntro title={shop.heading}>{shop.intro || undefined}</PageIntro>
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          {products.length > 0 && <ShopNotes notes={shop.notes} columns />}
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="border-t border-brown pt-8">
              <p className="font-display text-3xl font-semibold">
                Products coming soon
              </p>
              <p className="mt-2 text-sand">
                In the meantime, ask about aftercare at your next appointment.
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline-offset-4 hover:underline"
              >
                View services <span aria-hidden>&nbsp;→</span>
              </Link>
            </div>
          )}
        </div>
      </section>
      <BookCta />
    </main>
  );
}
