import type { Metadata } from "next";

import { FindBooking } from "./find-booking";

export const metadata: Metadata = {
  title: "Find my booking",
  description:
    "Check the status of your appointment with your booking reference and email.",
  robots: { index: false, follow: true },
};

export default function FindBookingPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Find my booking
      </h1>
      <p className="mt-4 text-lg text-muted">
        Enter the reference from your booking confirmation (it starts with
        TLI-) and the email you booked with to see whether it&rsquo;s been
        confirmed, check the details or cancel.
      </p>
      <FindBooking />
    </main>
  );
}
