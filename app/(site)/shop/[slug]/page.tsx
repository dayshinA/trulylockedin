import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WorkViewer } from "@/components/media/work-viewer";
import { AddToBasket } from "@/components/site/add-to-basket";
import { ProductGrid } from "@/components/site/product-grid";
import { ShopNotes } from "@/components/site/shop-notes";
import {
  getProduct,
  getPublishedProducts,
  getSiteContent,
} from "@/lib/data/public";
import { formatPrice } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return product
    ? {
        title: product.name,
        description:
          product.description ||
          `${product.name}, ${formatPrice(product.pricePence)}`,
      }
    : { title: "Shop" };
}

export default function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  return (
    <main className="flex flex-col">
      <Suspense fallback={<div className="min-h-svh" />}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({
  params,
}: {
  params: PageProps<"/shop/[slug]">["params"];
}) {
  const { slug } = await params;
  const [product, products, { shop }] = await Promise.all([
    getProduct(slug),
    getPublishedProducts(),
    getSiteContent(),
  ]);
  if (!product) notFound();

  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.category === product.category,
  );
  const related = (
    sameCategory.length > 0
      ? sameCategory
      : products.filter((p) => p.id !== product.id)
  ).slice(0, 4);

  return (
    <>
      <section className="px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/shop"
            className="-ml-1 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-gold transition-colors hover:text-gold-light"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to shop
          </Link>
          <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
            <WorkViewer
              media={product.media}
              title={product.name}
              className="grid grid-cols-2 gap-3 self-start"
              sizes={{
                wide: "(max-width: 1024px) 100vw, 640px",
                half: "(max-width: 1024px) 50vw, 320px",
              }}
            />
            <div className="flex flex-col lg:sticky lg:top-28 lg:self-start">
              <h1 className="font-display text-4xl leading-[1.05] font-semibold sm:text-6xl">
                {product.name}
              </h1>
              <p className="mt-4 text-2xl text-gold">
                {formatPrice(product.pricePence)}
              </p>
              {product.category && (
                <p className="mt-1 text-sm text-sand">{product.category}</p>
              )}
              {product.inStock ? (
                <AddToBasket productId={product.id} />
              ) : (
                <p className="mt-8 border-y border-brown py-4 text-sand">
                  Sold out for now.
                </p>
              )}
              {product.description && (
                <p className="mt-6 text-lg whitespace-pre-line text-sand">
                  {product.description}
                </p>
              )}
              {shop.notes.length > 0 && (
                <div className="mt-10">
                  <ShopNotes notes={shop.notes} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-4 pb-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">
              You might also like
            </h2>
            <ProductGrid products={related} filter={false} />
          </div>
        </section>
      )}
    </>
  );
}
