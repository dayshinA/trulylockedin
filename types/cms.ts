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
    // Cut-out with a transparent background, shown over the burgundy disc.
    // Without one the home page uses the bundled placeholder.
    portrait?: ContentImage;
  };
  // Photos placed in fixed spots on the home page. Empty spots are hidden.
  home: {
    // Beside the price list in "Services & prices".
    servicesImage?: ContentImage;
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
    // How ordering, collection and delivery work; one point per line.
    notes: string[];
  };
  seo: {
    description: string;
  };
  privacy: PrivacyNotice;
  terms: LegalDocument;
};

// A long page of legal text the owner edits as one block (see
// lib/content/legal-text.ts for the format: "## " headings, "- " bullets,
// blank lines between paragraphs).
export type LegalDocument = {
  // Salon-local yyyy-mm-dd, set on every save. For the terms it doubles as the
  // version a client agreed to (Booking.termsVersion / Order.termsVersion).
  updatedOn: string;
  body: string;
};

export type PrivacyNotice = LegalDocument & {
  // The sole trader's legal name: the data controller. Empty in the
  // placeholder; the admin form requires it.
  controllerName: string;
  // Where privacy requests go.
  contactEmail: string;
};
