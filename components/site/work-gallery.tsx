"use client";

import Link from "next/link";
import { useState } from "react";

import { WorkThumb } from "@/components/media/work-media";
import { coverOf } from "@/lib/portfolio/media";
import type { PortfolioItem } from "@/types/portfolio";

const SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

// Masonry grid with a client-side style filter (keeps the page static).
export function WorkGallery({ items }: { items: PortfolioItem[] }) {
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const [filter, setFilter] = useState<string | null>(null);
  const shown = filter ? items.filter((i) => i.category === filter) : items;

  return (
    <div className="flex flex-col gap-8">
      {categories.length > 1 && (
        <div
          role="group"
          aria-label="Filter by style"
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
              {c ?? "All work"}
            </button>
          ))}
        </div>
      )}

      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((item) => {
          const cover = coverOf(item);
          return (
            <li key={item.id} className="mb-8 break-inside-avoid">
              <Link href={`/work/${item.id}`} className="group block">
                <span className="block overflow-hidden rounded-sm bg-surface">
                  {cover ? (
                    <WorkThumb
                      media={cover}
                      sizes={SIZES}
                      className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="block aspect-[4/5] bg-line" />
                  )}
                </span>
                <span className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="font-display text-2xl font-semibold text-ink group-hover:text-brand-hover">
                    {item.title}
                  </span>
                  {item.category && (
                    <span className="shrink-0 text-xs tracking-[0.2em] text-brand uppercase">
                      {item.category}
                    </span>
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
