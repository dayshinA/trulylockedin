import type { Metadata } from "next";
import { Suspense } from "react";

import { getMember } from "@/lib/auth/member-dal";
import { getSiteContent } from "@/lib/data/public";
import { ThankYou, ThankYouHero } from "./thank-you";

export const metadata: Metadata = {
  title: "Thank you for booking",
  robots: { index: false, follow: false },
};

// Where the booking flow lands after a successful booking:
// /book/{ref}/thank-you#t={token}. The token stays in the fragment (see
// manage-booking.tsx), so the booking itself is fetched in the browser.
export default function ThankYouPage({
  params,
}: PageProps<"/book/[ref]/thank-you">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<ThankYouHero />}>
        <ThankYouLoader params={params} />
      </Suspense>
    </main>
  );
}

async function ThankYouLoader({
  params,
}: {
  params: PageProps<"/book/[ref]/thank-you">["params"];
}) {
  const [{ ref }, { contact, policies }, member] = await Promise.all([
    params,
    getSiteContent(),
    getMember(),
  ]);
  return (
    <ThankYou
      bookingRef={decodeURIComponent(ref)}
      contact={contact}
      bookingNotes={policies.booking}
      isMember={member !== null}
    />
  );
}
