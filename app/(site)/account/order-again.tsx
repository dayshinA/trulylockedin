"use client";

import { useRouter } from "next/navigation";

import { addToBasket, type BasketLine } from "@/lib/shop/basket";

// Puts the items that can still be bought back in the basket and opens it.
export function OrderAgain({ lines }: { lines: BasketLine[] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        for (const line of lines) addToBasket(line.productId, line.quantity);
        router.push("/shop/basket");
      }}
      className="inline-flex min-h-11 w-fit items-center rounded-full border border-field px-5 text-sm font-semibold text-ink transition-colors hover:border-brand"
    >
      Order again
    </button>
  );
}
