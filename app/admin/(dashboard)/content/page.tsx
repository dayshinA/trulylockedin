import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import type { SiteSection } from "@/lib/content/schemas";
import { readSiteContent } from "@/lib/content/store";
import { adminDb } from "@/lib/firebase/admin";
import { Badge, PageHeader, textLink } from "../_components/admin-ui";
import { PageGuide } from "../_components/help";
import {
  AboutForm,
  ContactForm,
  HeroForm,
  HomeForm,
  PoliciesForm,
  PrivacyForm,
  SeoForm,
  ShopForm,
  TermsForm,
  TestimonialsForm,
} from "./content-forms";

export const metadata: Metadata = {
  title: "Site content",
};

const SECTIONS: {
  id: SiteSection;
  title: string;
  where: string;
  href: string;
}[] = [
  {
    id: "hero",
    title: "Home page banner",
    where: "The first thing visitors see: the big headline and portrait at the top of the home page.",
    href: "/",
  },
  {
    id: "home",
    title: "Home page photos",
    where: "Photos in fixed spots further down the home page, such as the one beside “Services & prices”.",
    href: "/",
  },
  {
    id: "about",
    title: "About",
    where: "Your story on the About page. The first paragraph and the highlights also show on the home page.",
    href: "/about",
  },
  {
    id: "testimonials",
    title: "Reviews",
    where: "Client reviews on the home page. Remove them all to hide the section.",
    href: "/",
  },
  {
    id: "contact",
    title: "Contact details",
    where: "Your phone, WhatsApp, email, socials and address on the Contact page and in the footer of every page. Leave one empty to hide it.",
    href: "/contact",
  },
  {
    id: "policies",
    title: "Booking information",
    where: "What clients should know before they come (lateness, preparation, deposits). Shown on the Contact page, under “Before your appointment”, and in booking emails.",
    href: "/contact",
  },
  {
    id: "shop",
    title: "Shop",
    where: "The heading and introduction at the top of the Shop page. The ordering points also show on each product.",
    href: "/shop",
  },
  {
    id: "seo",
    title: "Search engines",
    where: "The short description Google shows under your site's name, and that appears when someone shares a link to it on WhatsApp or Instagram.",
    href: "/",
  },
  {
    id: "privacy",
    title: "Privacy notice",
    where: "The Privacy page, which explains what you do with clients' details. It's linked from the footer, booking, checkout and account sign-up.",
    href: "/privacy",
  },
  {
    id: "terms",
    title: "Terms & returns",
    where: "The Terms page: deposits, cancellations, shop orders and returns. Clients agree to it every time they book or order.",
    href: "/terms",
  },
];

// Live read (not the cached public one), so the forms always show what's stored.
export default async function ContentPage() {
  await verifyAdmin();
  const { content, saved } = await readSiteContent(adminDb());

  const forms: Record<SiteSection, React.ReactNode> = {
    hero: <HeroForm hero={content.hero} />,
    home: <HomeForm home={content.home} />,
    about: <AboutForm about={content.about} />,
    testimonials: <TestimonialsForm testimonials={content.testimonials} />,
    contact: <ContactForm contact={content.contact} />,
    policies: <PoliciesForm policies={content.policies} />,
    shop: <ShopForm shop={content.shop} />,
    seo: <SeoForm seo={content.seo} />,
    privacy: <PrivacyForm privacy={content.privacy} />,
    terms: <TermsForm terms={content.terms} />,
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-10">
      <PageHeader title="Site content" />
      <PageGuide
        id="content"
      >
          <li>
            This is where you change the <strong>words and pictures</strong> on
            your website: your story, reviews, contact details and policies.
          </li>
          <li>
            Tap a section to open it, make your changes, then press{" "}
            <strong>Save this section</strong> at the bottom of it. Each
            section saves on its own, and the website updates straight away.
          </li>
          <li>
            A <strong>Placeholder</strong> label means the website is still
            showing the sample text we wrote. Replace it with your own words,
            then save to remove the label.
          </li>
          <li>
            Want a word in <strong>orange</strong> in a heading? Put stars
            around it: <code>*Care*</code> first, then <code>*craft*</code>.
          </li>
          <li>
            Not sure how something looks? Use the{" "}
            <strong>See it on the website</strong> link in each section, which
            opens it in a new tab.
          </li>
      </PageGuide>
      <div className="border-t border-line">
        {SECTIONS.map(({ id, title, where, href }) => (
          <details key={id} className="group border-b border-line">
            <summary className="flex min-h-16 cursor-pointer items-center gap-3 py-3">
              <span className="flex-1 font-display text-2xl font-semibold transition-colors group-hover:text-brand-hover">
                {title}
              </span>
              {!saved.includes(id) && <Badge tone="muted">Placeholder</Badge>}
              <span aria-hidden className="text-brand group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className="pb-10">
              <div className="mb-6 flex flex-col gap-1 text-sm text-muted">
                <p>{where}</p>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLink}
                >
                  See it on the website ↗
                </a>
              </div>
              {forms[id]}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
