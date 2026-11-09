import { z } from "zod";

import { mediaPublicIdSchema } from "@/lib/media/folder";
import type { SiteContent } from "@/types/cms";

// One schema per section of siteContent/main. Used to validate admin saves and
// to check stored sections before the public site trusts them.

const line = (max: number, message = "Enter some text") =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);

const optional = (schema: z.ZodString) => schema.optional();

// Handles are stored without "@".
export const handleSchema = z
  .string()
  .regex(/^[A-Za-z0-9._]{1,30}$/, "Enter just the username, e.g. trulylockedin");

export const contentImageSchema = z.object({
  publicId: mediaPublicIdSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().trim().max(200, "At most 200 characters"),
});

export const heroSchema = z.object({
  eyebrow: z.string().trim().max(80, "At most 80 characters"),
  title: line(120, "Enter a headline"),
  subtitle: z.string().trim().max(300, "At most 300 characters"),
  portrait: contentImageSchema.optional(),
});

export const homeSchema = z.object({
  servicesImage: contentImageSchema.optional(),
});

export const highlightSchema = z.object({
  title: line(80, "Enter a title"),
  body: line(300, "Enter a sentence or two"),
});

export const aboutSchema = z.object({
  heading: line(120, "Enter a heading"),
  paragraphs: z
    .array(line(1500))
    .min(1, "Write at least one paragraph")
    .max(8, "At most 8 paragraphs"),
  highlights: z.array(highlightSchema).max(6, "At most 6 highlights"),
});

export const testimonialSchema = z.object({
  quote: line(600, "Enter the review"),
  name: line(80, "Enter a name, e.g. Client review"),
  detail: optional(z.string().trim().max(80, "At most 80 characters")),
});

export const testimonialsSchema = z
  .array(testimonialSchema)
  .max(12, "At most 12 reviews");

export const contactSchema = z.object({
  area: line(80, "Enter the area, e.g. South London"),
  addressLines: z.array(line(120)).max(6, "At most 6 address lines"),
  mapUrl: z
    .url({ protocol: /^https$/, error: "Paste a link starting with https://" })
    .max(500)
    .optional(),
  phone: optional(z.string().max(30)),
  email: z.email("Enter a valid email address").max(200).optional(),
  // Digits only, with the country code: "447700900123".
  whatsapp: z
    .string()
    .regex(/^[1-9]\d{7,14}$/)
    .optional(),
  instagram: handleSchema.optional(),
  tiktok: handleSchema.optional(),
});

export const policiesSchema = z.object({
  booking: z.array(line(300)).max(10, "At most 10 points"),
});

export const shopSchema = z.object({
  heading: line(120, "Enter a heading"),
  intro: z.string().trim().max(500, "At most 500 characters"),
  notes: z.array(line(300)).max(8, "At most 8 points"),
});

export const seoSchema = z.object({
  description: line(300, "Enter a short description"),
});

export const LEGAL_BODY_MAX = 40_000;

const legalBodySchema = z
  .string()
  .trim()
  .min(50, "Write the full text here")
  .max(LEGAL_BODY_MAX, `At most ${LEGAL_BODY_MAX.toLocaleString("en-GB")} characters`);

const updatedOnSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const termsSchema = z.object({
  updatedOn: updatedOnSchema,
  body: legalBodySchema,
});

export const privacySchema = termsSchema.extend({
  controllerName: line(120, "Enter your full legal name"),
  contactEmail: z.email("Enter a valid email address").max(200),
});

export const SECTION_SCHEMAS = {
  hero: heroSchema,
  home: homeSchema,
  about: aboutSchema,
  testimonials: testimonialsSchema,
  contact: contactSchema,
  policies: policiesSchema,
  shop: shopSchema,
  seo: seoSchema,
  privacy: privacySchema,
  terms: termsSchema,
} satisfies { [K in keyof SiteContent]: z.ZodType<SiteContent[K]> };

export type SiteSection = keyof SiteContent;
