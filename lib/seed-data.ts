import type { Service } from "@/types/booking";
import type { SiteContent } from "@/types/cms";

export {
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
} from "@/lib/booking/defaults";

// Placeholder services so the booking flow works before the owner adds their
// own. Names, durations and prices are examples; the owner edits them in the CMS.
export const SEED_SERVICES: Service[] = [
  {
    id: "consultation",
    name: "Loc consultation",
    slug: "consultation",
    description:
      "A short chat about your hair, goals and the right loc method for you.",
    durationMin: 30,
    priceFromPence: 0,
    category: "Consultation",
    active: true,
    order: 0,
  },
  {
    id: "starter-locs",
    name: "Starter locs",
    slug: "starter-locs",
    description: "Comb coils or two-strand twists to start your loc journey.",
    durationMin: 240,
    priceFromPence: 15000,
    depositNote: "A deposit may be required to secure this appointment.",
    category: "New locs",
    active: true,
    order: 1,
  },
  {
    id: "retwist-style",
    name: "Retwist & style",
    slug: "retwist-style",
    description: "Palm roll or two-strand retwist of new growth, plus a style.",
    durationMin: 120,
    priceFromPence: 6500,
    category: "Maintenance",
    active: true,
    order: 2,
  },
  {
    id: "interlocking",
    name: "Interlocking maintenance",
    slug: "interlocking",
    description: "Root maintenance with an interlocking tool.",
    durationMin: 180,
    priceFromPence: 9000,
    category: "Maintenance",
    active: true,
    order: 3,
  },
  {
    id: "loc-extensions",
    name: "Loc extensions",
    slug: "loc-extensions",
    description:
      "Full head of human hair loc extensions. Hair priced separately.",
    durationMin: 480,
    priceFromPence: 35000,
    depositNote: "A deposit is required to secure this appointment.",
    category: "New locs",
    active: true,
    order: 4,
  },
  {
    id: "loc-repair",
    name: "Loc repair",
    slug: "loc-repair",
    description: "Repair of thinning, weak or broken locs.",
    durationMin: 60,
    priceFromPence: 3500,
    category: "Maintenance",
    active: true,
    order: 5,
  },
];

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
