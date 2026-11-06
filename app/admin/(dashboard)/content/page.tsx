import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import type { SiteSection } from "@/lib/content/schemas";
import { readSiteContent } from "@/lib/content/store";
import { adminDb } from "@/lib/firebase/admin";
import { Badge, PageHeader } from "../_components/admin-ui";
import {
  AboutForm,
  ContactForm,
  HeroForm,
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
}[] = [
  { id: "hero", title: "Home page banner", where: "Top of the home page" },
  {
    id: "about",
    title: "About",
    where: "About page; the first paragraph and highlights also show on the home page",
  },
  { id: "testimonials", title: "Reviews", where: "Home page" },
  {
    id: "contact",
    title: "Contact details",
    where: "Contact page and footer. Leave a channel empty to hide it.",
  },
  {
    id: "policies",
    title: "Booking information",
    where: "Contact page, under “Before your appointment”",
  },
  {
    id: "shop",
    title: "Shop",
    where: "Top of the Shop page; the ordering points also show on each product",
  },
  {
    id: "seo",
    title: "Search engines",
    where: "The short description Google and link previews show",
  },
  {
    id: "privacy",
    title: "Privacy notice",
    where: "The Privacy page (/privacy), linked from the footer, booking, checkout and account sign-up",
  },
  {
    id: "terms",
    title: "Terms & returns",
    where: "The Terms page (/terms): deposits, cancellations, shop orders and returns",
  },
];

// Live read (not the cached public one), so the forms always show what's stored.
export default async function ContentPage() {
  await verifyAdmin();
  const { content, saved } = await readSiteContent(adminDb());

  const forms: Record<SiteSection, React.ReactNode> = {
    hero: <HeroForm hero={content.hero} />,
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
      <PageHeader title="Site content">
        The words on the public website. Each section saves on its own.
      </PageHeader>
      <div className="border-t border-line">
        {SECTIONS.map(({ id, title, where }) => (
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
              <p className="mb-6 text-sm text-muted">{where}</p>
              {forms[id]}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
