import { z } from "zod";

import { slugify, type Parsed } from "@/lib/booking/admin-forms";
import type { PortfolioItem } from "@/types/portfolio";
import { mediaSchema, portfolioIdSchema } from "./schemas";

type Form = Pick<FormData, "get">;

const text = (form: Form, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const formSchema = z.object({
  title: z.string().min(1, "Enter a title").max(100),
  id: portfolioIdSchema,
  category: z.string().max(60),
  description: z.string().max(2000),
  order: z.coerce.number("Enter a number").int().min(0).max(9999),
  media: z.array(mediaSchema).max(30, "At most 30 photos or videos per look"),
});

export type PortfolioFormValue = Omit<PortfolioItem, "createdAt" | "updatedAt">;

// "media" is a JSON array maintained by the media manager in the form.
// The id comes from the slug field on create and is fixed on update.
export function parsePortfolioForm(
  form: Form,
  existingId?: string,
): Parsed<PortfolioFormValue> {
  let media: unknown;
  try {
    media = JSON.parse(text(form, "media") || "[]");
  } catch {
    return { ok: false, fieldErrors: { media: ["Upload the photos again"] } };
  }

  const parsed = formSchema.safeParse({
    title: text(form, "title"),
    id: existingId ?? (text(form, "slug") || slugify(text(form, "title"))),
    category: text(form, "category"),
    description: text(form, "description"),
    order: text(form, "order") || "0",
    media,
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    // The id is edited through the "slug" field.
    const { id, ...rest } = fieldErrors;
    return { ok: false, fieldErrors: id ? { ...rest, slug: id } : rest };
  }

  const value = parsed.data;
  const published = form.get("published") === "on";
  if (published && !value.media.some((m) => m.type === "image")) {
    return {
      ok: false,
      fieldErrors: { media: ["Add at least one photo before publishing"] },
    };
  }

  const cover = text(form, "coverPublicId");
  return {
    ok: true,
    value: {
      ...value,
      coverPublicId: value.media.some((m) => m.publicId === cover)
        ? cover
        : undefined,
      featured: form.get("featured") === "on",
      published,
    },
  };
}
