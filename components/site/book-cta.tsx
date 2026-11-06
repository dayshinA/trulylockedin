import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { Highlight } from "@/components/site/highlight";

export function BookCta({
  title = "Ready when *you* are",
  text = "Pick a service and a time that suits you. It only takes a minute.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="surface-burgundy px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span aria-hidden className="mb-6 h-0.5 w-12 bg-accent" />
        <h2 className="font-display text-4xl font-semibold sm:text-6xl">
          <Highlight text={title} />
        </h2>
        <p className="mt-4 max-w-md text-muted">{text}</p>
        <Link
          href="/book"
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-accent px-8 text-sm font-semibold tracking-widest text-on-accent uppercase transition-colors hover:bg-accent-hover"
        >
          Book an appointment
        </Link>
      </Reveal>
    </section>
  );
}
