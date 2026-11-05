import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentCancelled } from "./payment-cancelled";

export const metadata: Metadata = {
  title: "Payment not completed",
  robots: { index: false, follow: false },
};

// Stripe's cancel_url: the client left the deposit payment page.
export default function PaymentCancelledPage({
  params,
}: PageProps<"/book/[ref]/payment-cancelled">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Payment not completed
      </h1>
      <Suspense fallback={<p className="mt-8 text-muted">Just a moment…</p>}>
        <Loader params={params} />
      </Suspense>
    </main>
  );
}

async function Loader({
  params,
}: {
  params: PageProps<"/book/[ref]/payment-cancelled">["params"];
}) {
  const { ref } = await params;
  return <PaymentCancelled bookingRef={decodeURIComponent(ref)} />;
}
