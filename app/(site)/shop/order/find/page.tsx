import type { Metadata } from "next";

import { FindOrder } from "./find-order";

export const metadata: Metadata = {
  title: "Find my order",
  description:
    "Check the status of your shop order with your order reference and email.",
  robots: { index: false, follow: true },
};

export default function FindOrderPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Find my order
      </h1>
      <p className="mt-4 text-lg text-muted">
        Enter the reference from your order confirmation (it starts with TLO-)
        and the email you ordered with to see whether it&rsquo;s ready, check
        what you ordered or cancel.
      </p>
      <FindOrder />
    </main>
  );
}
