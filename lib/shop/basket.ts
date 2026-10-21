import { useSyncExternalStore } from "react";

import { MAX_ORDER_LINES, MAX_QUANTITY } from "./schemas";

// The shopping basket lives in this browser only (localStorage). It holds ids
// and quantities; names, prices and stock are always read from the current
// products, and the server re-checks them when the order is placed.

export type BasketLine = { productId: string; quantity: number };

const KEY = "tli-basket";
const EMPTY: BasketLine[] = [];
const listeners = new Set<() => void>();

// Used when localStorage is unavailable.
let memory: BasketLine[] = EMPTY;
let cachedRaw: string | null = null;
let cached: BasketLine[] = EMPTY;

function read(): BasketLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode, settings): the basket stays in memory.
    return memory;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    cached = Array.isArray(parsed)
      ? parsed
          .filter(
            (l): l is BasketLine =>
              typeof l?.productId === "string" &&
              Number.isInteger(l?.quantity) &&
              l.quantity > 0,
          )
          .slice(0, MAX_ORDER_LINES)
      : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(lines: BasketLine[]) {
  memory = lines;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Kept in memory only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other tabs in step.
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Empty on the server and during hydration.
export function useBasket(): BasketLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const clamp = (quantity: number) =>
  Math.max(1, Math.min(MAX_QUANTITY, Math.floor(quantity)));

export function addToBasket(productId: string, quantity = 1) {
  const lines = read();
  const existing = lines.find((l) => l.productId === productId);
  if (!existing && lines.length >= MAX_ORDER_LINES) return;
  write(
    existing
      ? lines.map((l) =>
          l.productId === productId
            ? { ...l, quantity: clamp(l.quantity + quantity) }
            : l,
        )
      : [...lines, { productId, quantity: clamp(quantity) }],
  );
}

export function setBasketQuantity(productId: string, quantity: number) {
  write(
    read().map((l) =>
      l.productId === productId ? { ...l, quantity: clamp(quantity) } : l,
    ),
  );
}

export function removeFromBasket(productId: string) {
  write(read().filter((l) => l.productId !== productId));
}

export function clearBasket() {
  write(EMPTY);
}
