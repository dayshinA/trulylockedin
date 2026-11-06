import Link from "next/link";

import { summarizeWeeklyHours } from "@/lib/booking/hours-summary";
import { getOpeningHours, getSiteContent } from "@/lib/data/public";
import { SITE_NAME } from "@/lib/site";
import { contactChannels, ContactLinks } from "./contact-links";
import { Logo } from "./logo";
import { NAV_LINKS } from "./nav-links";

export async function Footer() {
  const [content, weekly] = await Promise.all([
    getSiteContent(),
    getOpeningHours(),
  ]);
  const { contact } = content;

  return (
    <footer className="surface-burgundy border-t border-line">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-5 sm:px-6 sm:pt-12">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1.3fr_1.3fr]">
          <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-start">
            <Link href="/" className="inline-block shrink-0">
              <Logo className="h-auto w-36 lg:w-44" sizes="176px" />
            </Link>
            {content.hero.eyebrow && (
              <p className="max-w-xs text-sm text-muted">{content.hero.eyebrow}</p>
            )}
          </div>

          <FooterColumn title="Pages">
            <nav
              aria-label="Footer"
              className="flex flex-wrap gap-x-5 text-sm sm:flex-col sm:gap-x-0"
            >
              {[
                ...NAV_LINKS,
                { href: "/book", label: "Book online" },
                { href: "/book/find", label: "Find my booking" },
                { href: "/shop/order/find", label: "Find my order" },
              ].map(
                ({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex min-h-11 w-fit items-center text-ink transition-colors hover:text-brand-hover"
                  >
                    {label}
                  </Link>
                ),
              )}
            </nav>
          </FooterColumn>

          <FooterColumn title="Contact">
            {contactChannels(contact).length > 0 ? (
              <ContactLinks contact={contact} />
            ) : (
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center text-sm text-ink transition-colors hover:text-brand-hover"
              >
                Contact page
              </Link>
            )}
          </FooterColumn>

          {weekly && (
            <FooterColumn title="Opening hours">
              <dl className="text-sm">
                {summarizeWeeklyHours(weekly).map(({ days, hours }) => (
                  <div
                    key={days}
                    className="flex justify-between gap-4 border-b border-line py-2 first:pt-0 last:border-b-0"
                  >
                    <dt className="text-muted">{days}</dt>
                    <dd
                      className={
                        hours === "Closed" ? "text-muted" : "text-ink"
                      }
                    >
                      {hours}
                    </dd>
                  </div>
                ))}
              </dl>
            </FooterColumn>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line pt-4 text-xs text-muted">
          <p className="flex flex-wrap items-center gap-x-4">
            <span>© {SITE_NAME}</span>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center transition-colors hover:text-ink"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-11 items-center transition-colors hover:text-ink"
            >
              Terms &amp; returns
            </Link>
          </p>
          <p className="inline-flex min-h-11 items-center">
            By appointment only
            {contact.area && ` · ${contact.area}`}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-1 font-display text-lg font-semibold text-accent-ink">
        {title}
      </h2>
      {children}
    </div>
  );
}
