import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { ChannelIcon } from "@/components/site/channel-icon";
import { contactChannels, publicContact } from "@/components/site/contact-links";
import { PageIntro } from "@/components/site/page-intro";
import { summarizeWeeklyHours } from "@/lib/booking/hours-summary";
import { getOpeningHours, getSiteContent } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Contact",
};

export default async function ContactPage() {
  const [content, weekly] = await Promise.all([
    getSiteContent(),
    getOpeningHours(),
  ]);
  const { policies } = content;
  const contact = publicContact(content);
  const channels = contactChannels(contact);

  return (
    <main className="flex flex-col">
      <PageIntro title="Get in *touch*">
        The quickest way to get an appointment is to book online. For anything
        else, here&rsquo;s where to find us.
      </PageIntro>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-[3fr_2fr] lg:gap-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold">
              Contact details
            </h2>
            {channels.length > 0 ? (
              <ul className="mt-6 border-t border-line">
                {channels.map(({ channel, label, value, href }) => {
                  const external = href.startsWith("http");
                  return (
                    <li key={label} className="border-b border-line">
                      <a
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="group flex min-h-11 items-center gap-4 py-5"
                      >
                        <span className="flex shrink-0 items-center gap-3 text-sm text-muted sm:w-36">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-ink transition-colors group-hover:bg-accent group-hover:text-on-accent">
                            <ChannelIcon channel={channel} className="size-5" />
                          </span>
                          <span className="hidden sm:inline">{label}</span>
                          <span className="sr-only sm:hidden">{label}</span>
                        </span>
                        <span className="min-w-0 flex-1 font-display [overflow-wrap:anywhere] text-2xl font-semibold text-accent-ink transition-colors group-hover:text-brand-hover sm:text-3xl">
                          {value}
                        </span>
                        {external && (
                          <ArrowUpRight
                            aria-hidden
                            className="size-5 shrink-0 self-center text-accent-ink"
                          />
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-6 border-t border-line pt-6 text-muted">
                Book online and we&rsquo;ll confirm by email. You can reply to
                that email with any questions.
              </p>
            )}
            <Link
              href="/book"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand px-8 text-sm font-semibold tracking-widest text-on-brand uppercase transition-colors hover:bg-brand-hover"
            >
              Book online
            </Link>
          </Reveal>

          <Reveal className="flex flex-col gap-12">
            <div>
              <h2 className="font-display text-3xl font-semibold">Studio</h2>
              <div className="mt-6 border-t border-line pt-5">
                {contact.addressLines.length > 0 ? (
                  <address className="text-lg text-accent-ink not-italic">
                    {contact.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                ) : (
                  <p className="text-lg text-accent-ink">
                    {contact.area}
                    <span className="mt-1 block text-base text-muted">
                      The full address is shared when you book.
                    </span>
                  </p>
                )}
                {contact.mapUrl && (
                  <a
                    href={contact.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
                  >
                    Open in maps <span aria-hidden className="text-accent">&nbsp;→</span>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-display text-3xl font-semibold">
                Opening hours
              </h2>
              {weekly ? (
                <dl className="mt-6 border-t border-line">
                  {summarizeWeeklyHours(weekly).map(({ days, hours }) => (
                    <div
                      key={days}
                      className="flex justify-between gap-6 border-b border-line py-3"
                    >
                      <dt className="text-muted">{days}</dt>
                      <dd
                        className={
                          hours === "Closed"
                            ? "text-muted"
                            : "font-semibold text-accent-ink"
                        }
                      >
                        {hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-6 border-t border-line pt-5 text-muted">
                  See available times when you book.
                </p>
              )}
              <p className="mt-4 text-sm text-muted">By appointment only.</p>
            </div>
          </Reveal>
        </div>

        {policies.booking.length > 0 && (
          <Reveal className="mx-auto mt-24 grid max-w-6xl gap-8 md:grid-cols-[2fr_3fr] md:gap-16">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Before your appointment
            </h2>
            <ol className="border-t border-line">
              {policies.booking.map((item, i) => (
                <li
                  key={item}
                  className="grid grid-cols-[3rem_1fr] gap-4 border-b border-line py-5"
                >
                  <span className="font-display text-2xl text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-1 text-muted">{item}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        )}
      </section>
    </main>
  );
}
