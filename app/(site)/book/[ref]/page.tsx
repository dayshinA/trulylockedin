import type { Metadata } from "next";
import { Suspense } from "react";

import { ManageBooking } from "./manage-booking";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default function ManageBookingPage({
  params,
}: PageProps<"/book/[ref]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Your booking
      </h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <ManageLoader params={params} />
      </Suspense>
    </main>
  );
}

async function ManageLoader({
  params,
}: {
  params: PageProps<"/book/[ref]">["params"];
}) {
  const { ref } = await params;
  return <ManageBooking bookingRef={decodeURIComponent(ref)} />;
}
