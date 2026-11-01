"use client";

import { CldImage } from "next-cloudinary";
import Link from "next/link";
import { useState } from "react";

import { formatPrice } from "@/lib/format";
import { coverOf } from "@/lib/portfolio/media";
import type { Product } from "@/types/shop";

const SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

// Square product photos with a client-side category filter (keeps the page
// static). Out-of-stock products stay visible, marked "Sold out".
export function ProductGrid({
  products,
  filter: showFilter = true,
}: {
  products: Product[];
  filter?: boolean;
}) {
  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];
  const [filter, setFilter] = useState<string | null>(null);
  const shown = filter
    ? products.filter((p) => p.category === filter)
    : products;

  return (
    <div className="flex flex-col gap-8">
      {showFilter && categories.length > 1 && (
        <div
          role="group"
          aria-label="Filter by category"
          className="-mx-4 flex gap-8 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
        >
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "all"}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={`-mb-px min-h-11 shrink-0 border-b-2 text-sm transition-colors ${
                filter === c
                  ? "border-brand text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {c ?? "All products"}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((product) => {
          const cover = coverOf(product);
          return (
            <li key={product.id}>
              <Link href={`/shop/${product.id}`} className="group block">
                <span className="block aspect-square overflow-hidden rounded-sm bg-surface">
                  {cover && (
                    <CldImage
                      src={cover.publicId}
                      width={800}
                      height={800}
                      crop="fill"
                      gravity="auto"
                      sizes={SIZES}
                      alt={cover.alt}
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  )}
                </span>
                <span className="mt-3 block font-display text-xl leading-tight font-semibold text-ink group-hover:text-brand-hover">
                  {product.name}
                </span>
                <span className="mt-1 block text-sm">
                  <span className="text-brand">
                    {formatPrice(product.pricePence)}
                  </span>
                  {!product.inStock && (
                    <span className="text-muted"> · Sold out</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
