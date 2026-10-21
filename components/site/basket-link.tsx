"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { useBasket } from "@/lib/shop/basket";
import { itemCount } from "@/lib/shop/orders";

export function BasketLink() {
  const count = itemCount(useBasket());
  return (
    <Link
      href="/shop/basket"
      aria-label={count > 0 ? `Basket, ${count} items` : "Basket"}
      className="relative z-50 inline-flex min-h-11 min-w-11 items-center justify-center text-cream transition-colors hover:text-gold"
    >
      <ShoppingBag aria-hidden className="size-5" />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] leading-5 font-semibold text-espresso">
          {count}
        </span>
      )}
    </Link>
  );
}
