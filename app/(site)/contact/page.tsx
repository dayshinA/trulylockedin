import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { contactChannels } from "@/components/site/contact-links";
import { PageIntro } from "@/components/site/page-intro";
import { summarizeWeeklyHours } from "@/lib/booking/hours-summary";
import { getOpeningHours, getSiteContent } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Contact",
};

export default async function ContactPage() {
  const [{ contact, policies }, weekly] = await Promise.all([
    getSiteContent(),
    getOpeningHours(),
  ]);
  const channels = contactChannels(contact);

  return (
    <main className="flex flex-col">
      <PageIntro title="Get in touch">
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
              <ul className="mt-6 border-t border-brown">
                {channels.map(({ label, value, href }) => {
                  const external = href.startsWith("http");
                  return (
                    <li key={label} className="border-b border-brown">
                      <a
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="group flex min-h-11 items-baseline gap-4 py-5"
                      >
                        <span className="w-24 shrink-0 text-sm text-sand">
                          {label}
                        </span>
                        <span className="min-w-0 flex-1 font-display [overflow-wrap:anywhere] text-2xl font-semibold text-cream transition-colors group-hover:text-gold-light sm:text-3xl">
                          {value}
                        </span>
                        {external && (
                          <ArrowUpRight
                            aria-hidden
                            className="size-5 shrink-0 self-center text-gold"
                          />
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-6 border-t border-brown pt-6 text-sand">
                Contact details coming soon.
              </p>
            )}
            <Link
              href="/book"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-gold px-8 text-sm font-semibold tracking-widest text-espresso uppercase transition-colors hover:bg-gold-light"
            >
              Book online
            </Link>
          </Reveal>

          <Reveal className="flex flex-col gap-12">
            <div>
              <h2 className="font-display text-3xl font-semibold">Studio</h2>
              <div className="mt-6 border-t border-brown pt-5">
                {contact.addressLines.length > 0 ? (
                  <address className="text-lg not-italic">
                    {contact.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                ) : (
                  <p className="text-lg">
                    {contact.area}
                    <span className="mt-1 block text-base text-sand">
                      The full address is shared when you book.
                    </span>
                  </p>
                )}
                {contact.mapUrl && (
                  <a
                    href={contact.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline-offset-4 hover:underline"
                  >
                    Open in maps <span aria-hidden>&nbsp;→</span>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-display text-3xl font-semibold">
                Opening hours
              </h2>
              {weekly ? (
                <dl className="mt-6 border-t border-brown">
                  {summarizeWeeklyHours(weekly).map(({ days, hours }) => (
                    <div
                      key={days}
                      className="flex justify-between gap-6 border-b border-brown py-3"
                    >
                      <dt className="text-sand">{days}</dt>
                      <dd className={hours === "Closed" ? "text-sand" : ""}>
                        {hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-6 border-t border-brown pt-5 text-sand">
                  See available times when you book.
                </p>
              )}
              <p className="mt-4 text-sm text-sand">By appointment only.</p>
            </div>
          </Reveal>
        </div>

        {policies.booking.length > 0 && (
          <Reveal className="mx-auto mt-24 grid max-w-6xl gap-8 md:grid-cols-[2fr_3fr] md:gap-16">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Before your appointment
            </h2>
            <ol className="border-t border-brown">
              {policies.booking.map((item, i) => (
                <li
                  key={item}
                  className="grid grid-cols-[3rem_1fr] gap-4 border-b border-brown py-5"
                >
                  <span className="font-display text-2xl text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-1 text-sand">{item}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        )}
      </section>
    </main>
  );
}
