import type { SiteContent } from "@/types/cms";

export {
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
} from "@/lib/booking/defaults";
export { SEED_CATEGORIES, SEED_SERVICES } from "@/lib/booking/seed-catalogue";

// Placeholder copy until the owner writes their own in the CMS. Contact
// details are left empty on purpose: the site hides what isn't filled in.
export const SEED_SITE_CONTENT: SiteContent = {
  hero: {
    eyebrow: "Locs · Retwists · Styling",
    title: "Locs, crafted with intention.",
    subtitle:
      "Healthy starter locs, maintenance and styling from a loctician who takes the time to get it right.",
  },
  about: {
    heading: "Care first, then craft",
    paragraphs: [
      "Every loc journey is personal. Appointments start with your hair, your scalp and how you want to wear your locs, then we build a plan that keeps them healthy for years.",
      "From first coils to long-term maintenance, the focus is on neat parts, strong roots and styles that last between visits. No rushing, no shortcuts.",
    ],
    highlights: [
      {
        title: "Healthy roots",
        body: "Gentle techniques that protect your edges and scalp.",
      },
      {
        title: "Time to do it right",
        body: "Appointments are booked with enough time for your hair, never squeezed in.",
      },
      {
        title: "Aftercare that works",
        body: "Clear advice on washing, sleeping and styling between visits.",
      },
    ],
  },
  testimonials: [
    {
      quote:
        "My starter locs came out so neat and the parts are perfect. I finally feel confident wearing my hair out.",
      name: "Client review",
      detail: "Starter locs",
    },
    {
      quote:
        "Always on time, always gentle, and my retwists last weeks longer than anywhere else I've been.",
      name: "Client review",
      detail: "Retwist & style",
    },
    {
      quote:
        "Talked me through everything at the consultation. No pressure, just honest advice.",
      name: "Client review",
      detail: "Consultation",
    },
  ],
  contact: {
    area: "London",
    addressLines: [],
  },
  policies: {
    booking: [
      "Please arrive with clean, detangled hair unless your appointment includes a wash.",
      "Running late? Let us know as soon as you can — late arrivals may need to be shortened or rebooked.",
      "You can cancel online up to 24 hours before your appointment using the link in your booking confirmation.",
    ],
  },
  shop: {
    heading: "Products for healthy locs",
    intro:
      "The oils, sprays and accessories used in the chair, for looking after your locs between appointments.",
    notes: [
      "Order online and pay when you collect in the salon.",
      "We'll message you when your order is ready to collect.",
    ],
  },
  seo: {
    description:
      "Loc installation, retwists, maintenance and styling. View the work and book your appointment online.",
  },
};
