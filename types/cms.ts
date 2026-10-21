// siteContent/main — the editable copy for the public site. Every field has a
// placeholder in lib/seed-data.ts; empty optional fields are simply not shown.

export type Testimonial = {
  quote: string;
  name: string;
  // e.g. "Starter locs, 2025"
  detail?: string;
};

export type Highlight = {
  title: string;
  body: string;
};

// A photo in our Cloudinary folder (see lib/media/folder.ts).
export type ContentImage = {
  publicId: string;
  width: number;
  height: number;
  alt: string;
};

export type SiteContent = {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    // Shown beside the headline; without one the panel is a plain colour.
    image?: ContentImage;
  };
  about: {
    heading: string;
    // First paragraph doubles as the home-page teaser.
    paragraphs: string[];
    highlights: Highlight[];
  };
  testimonials: Testimonial[];
  contact: {
    // e.g. "South London" — shown when there's no full address.
    area: string;
    addressLines: string[];
    mapUrl?: string;
    phone?: string;
    email?: string;
    // Digits with country code, e.g. "447700900123".
    whatsapp?: string;
    instagram?: string;
    tiktok?: string;
  };
  policies: {
    booking: string[];
  };
  shop: {
    heading: string;
    intro: string;
    // How ordering and collection work; one point per line.
    notes: string[];
  };
  seo: {
    description: string;
  };
};
