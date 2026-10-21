import { z } from "zod";

import type { FieldErrors, Parsed } from "@/lib/booking/admin-forms";
import { normalizePhone } from "@/lib/booking/request";
import type { SiteContent } from "@/types/cms";
import {
  aboutSchema,
  contactSchema,
  heroSchema,
  highlightSchema,
  policiesSchema,
  seoSchema,
  shopSchema,
  testimonialSchema,
  testimonialsSchema,
} from "./schemas";

// FormData → one validated section of siteContent/main. Framework-free and
// tested; the Server Actions only add auth, storage and cache invalidation.
//
// Repeated rows (highlights, reviews) post each field under one name, read in
// order with getAll. Fully blank rows are dropped; row errors are keyed
// "<field>.<row>" using the row's position in the form.

type Form = Pick<FormData, "get" | "getAll">;

const text = (form: Form, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const all = (form: Form, key: string) =>
  form.getAll(key).map((v) => (typeof v === "string" ? v.trim() : ""));

// One item per non-empty line.
export const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

// Paragraphs are separated by a blank line.
export const splitParagraphs = (value: string) =>
  value
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);

// "@name", "name" or a pasted profile link → "name".
export function toHandle(value: string): string {
  const trimmed = value.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  const last = trimmed.split("/").pop() ?? "";
  return last.replace(/^@/, "");
}

function errorsOf(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    // Lines of a textarea report against the textarea itself.
    const item = issue.path[1];
    const message =
      typeof item === "number" && issue.path.length === 2
        ? `Line ${item + 1}: ${issue.message}`
        : issue.message;
    (errors[key] ??= []).push(message);
  }
  return errors;
}

function result<T>(parsed: z.ZodSafeParseResult<T>): Parsed<T> {
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, fieldErrors: errorsOf(parsed.error) };
}

// Validates each non-blank row on its own so errors point at the right row.
function parseRows<T>(
  rows: Record<string, string>[],
  schema: z.ZodType<T>,
): { value: T[]; errors: FieldErrors } {
  const value: T[] = [];
  const errors: FieldErrors = {};
  rows.forEach((row, index) => {
    if (Object.values(row).every((v) => v === "")) return;
    const parsed = schema.safeParse(row);
    if (parsed.success) {
      value.push(parsed.data);
      return;
    }
    for (const issue of parsed.error.issues) {
      (errors[`${String(issue.path[0])}.${index}`] ??= []).push(issue.message);
    }
  });
  return { value, errors };
}

const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

export function parseHeroForm(form: Form): Parsed<SiteContent["hero"]> {
  return result(
    heroSchema.safeParse({
      eyebrow: text(form, "eyebrow"),
      title: text(form, "title"),
      subtitle: text(form, "subtitle"),
      image: text(form, "imagePublicId")
        ? {
            publicId: text(form, "imagePublicId"),
            width: Number(text(form, "imageWidth")),
            height: Number(text(form, "imageHeight")),
            alt: text(form, "imageAlt"),
          }
        : undefined,
    }),
  );
}

export function parseAboutForm(form: Form): Parsed<SiteContent["about"]> {
  const titles = all(form, "highlightTitle");
  const bodies = all(form, "highlightBody");
  const highlights = parseRows(
    titles.map((title, i) => ({ title, body: bodies[i] ?? "" })),
    highlightSchema,
  );
  const parsed = aboutSchema.safeParse({
    heading: text(form, "heading"),
    paragraphs: splitParagraphs(text(form, "paragraphs")),
    highlights: highlights.value,
  });
  const errors = {
    ...(parsed.success ? {} : errorsOf(parsed.error)),
    ...highlights.errors,
  };
  if (!parsed.success || hasErrors(errors)) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, value: parsed.data };
}

export function parseTestimonialsForm(
  form: Form,
): Parsed<SiteContent["testimonials"]> {
  const quotes = all(form, "quote");
  const names = all(form, "name");
  const details = all(form, "detail");
  const rows = parseRows(
    quotes.map((quote, i) => ({
      quote,
      name: names[i] ?? "",
      detail: details[i] ?? "",
    })),
    testimonialSchema.transform(({ detail, ...rest }) =>
      detail ? { ...rest, detail } : rest,
    ),
  );
  if (hasErrors(rows.errors)) return { ok: false, fieldErrors: rows.errors };
  const parsed = testimonialsSchema.safeParse(rows.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, fieldErrors: { form: [parsed.error.issues[0].message] } };
}

export function parseContactForm(form: Form): Parsed<SiteContent["contact"]> {
  const errors: FieldErrors = {};
  const phoneInput = text(form, "phone");
  const whatsappInput = text(form, "whatsapp");
  const whatsapp = whatsappInput ? normalizePhone(whatsappInput) : null;
  if (phoneInput && !normalizePhone(phoneInput)) {
    errors.phone = ["Enter a UK number like 07700 900123, or +country code"];
  }
  if (whatsappInput && !whatsapp) {
    errors.whatsapp = ["Enter a UK number like 07700 900123, or +country code"];
  }

  const optional = (value: string) => value || undefined;
  const parsed = contactSchema.safeParse({
    area: text(form, "area"),
    addressLines: splitLines(text(form, "addressLines")),
    mapUrl: optional(text(form, "mapUrl")),
    // Shown as typed; tel: links strip the spaces.
    phone: optional(phoneInput),
    email: optional(text(form, "email")),
    whatsapp: whatsapp?.slice(1),
    instagram: optional(toHandle(text(form, "instagram"))),
    tiktok: optional(toHandle(text(form, "tiktok"))),
  });
  const fieldErrors = {
    ...(parsed.success ? {} : errorsOf(parsed.error)),
    ...errors,
  };
  if (!parsed.success || hasErrors(fieldErrors)) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: parsed.data };
}

export function parsePoliciesForm(
  form: Form,
): Parsed<SiteContent["policies"]> {
  return result(
    policiesSchema.safeParse({ booking: splitLines(text(form, "booking")) }),
  );
}

export function parseShopForm(form: Form): Parsed<SiteContent["shop"]> {
  return result(
    shopSchema.safeParse({
      heading: text(form, "heading"),
      intro: text(form, "intro"),
      notes: splitLines(text(form, "notes")),
    }),
  );
}

export function parseSeoForm(form: Form): Parsed<SiteContent["seo"]> {
  return result(seoSchema.safeParse({ description: text(form, "description") }));
}
