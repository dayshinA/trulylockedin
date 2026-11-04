import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getMember } from "@/lib/auth/member-dal";
import { getPublishedProducts, getSiteContent } from "@/lib/data/public";
import { coverOf } from "@/lib/portfolio/media";
import { Basket, type BasketProduct } from "./basket";

export const metadata: Metadata = {
  title: "Basket",
  robots: { index: false, follow: false },
};

export default function BasketPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <Link
        href="/shop"
        className="-ml-1 mb-4 inline-flex min-h-11 w-fit items-center gap-2 px-1 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Continue shopping
      </Link>
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Your basket
      </h1>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <BasketLoader />
      </Suspense>
    </main>
  );
}

// Products and copy are cached; the member is read per request (for the
// checkout prefill), so this part streams in.
async function BasketLoader() {
  const [products, { shop }, member] = await Promise.all([
    getPublishedProducts(),
    getSiteContent(),
    getMember(),
  ]);
  const catalogue: BasketProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    pricePence: p.pricePence,
    inStock: p.inStock,
    coverPublicId: coverOf(p)?.publicId,
  }));

  return (
    <Basket
      products={catalogue}
      notes={shop.notes}
      member={
        member
          ? { name: member.name, email: member.email, phone: member.phone }
          : null
      }
    />
  );
}
