"use client";

import Link from "next/link";
import { useState } from "react";

import { addToBasket, useBasket } from "@/lib/shop/basket";
import { QuantityStepper } from "./quantity-stepper";

export function AddToBasket({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const inBasket =
    useBasket().find((l) => l.productId === productId)?.quantity ?? 0;

  function add() {
    addToBasket(productId, quantity);
    setAdded(true);
    setQuantity(1);
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <button
          type="button"
          onClick={add}
          className="min-h-12 flex-1 rounded-full bg-gold px-8 text-sm font-semibold tracking-widest text-espresso uppercase transition-colors hover:bg-gold-light sm:flex-none"
        >
          Add to basket
        </button>
      </div>
      {(added || inBasket > 0) && (
        <p role="status" className="text-sm text-sand">
          {added ? "Added. " : ""}
          {inBasket} in your basket ·{" "}
          <Link
            href="/shop/basket"
            className="font-semibold text-gold underline-offset-4 hover:underline"
          >
            View basket
          </Link>
        </p>
      )}
    </div>
  );
}
