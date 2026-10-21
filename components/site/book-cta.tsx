import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";

export function BookCta({
  title = "Ready when you are",
  text = "Pick a service and a time that suits you. It only takes a minute.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="bg-wine px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="font-display text-4xl font-semibold sm:text-6xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-sand">{text}</p>
        <Link
          href="/book"
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-gold px-8 text-sm font-semibold tracking-widest text-espresso uppercase transition-colors hover:bg-gold-light"
        >
          Book an appointment
        </Link>
      </Reveal>
    </section>
  );
}
