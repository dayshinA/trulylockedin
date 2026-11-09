import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { BookCta } from "@/components/site/book-cta";
import { InkLogo } from "@/components/site/logo";
import { PageIntro } from "@/components/site/page-intro";
import { getSiteContent } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "About",
};

export default async function AboutPage() {
  const { about } = await getSiteContent();
  const [lead, ...rest] = about.paragraphs;

  return (
    <main className="flex flex-col">
      <PageIntro title={about.heading}>{lead}</PageIntro>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.2fr_1fr] md:gap-16">
          <div className="flex flex-col justify-between gap-12">
            {rest.length > 0 && (
              <Reveal
                stagger
                className="flex max-w-prose flex-col gap-5 text-lg text-muted"
              >
                {rest.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </Reveal>
            )}
            <InkLogo className="w-60 sm:w-80 lg:w-[26rem]" />
          </div>
          {about.highlights.length > 0 && (
            <Reveal>
              <ol className="border-t border-line">
                {about.highlights.map((h, i) => (
                  <li
                    key={h.title}
                    className="grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-6"
                  >
                    <span className="font-display text-2xl text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-semibold">
                        {h.title}
                      </h2>
                      <p className="mt-1 text-muted">{h.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}
        </div>
      </section>

      <BookCta />
    </main>
  );
}
