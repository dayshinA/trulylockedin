import { z } from "zod";

import { poundsToPence, slugify, type Parsed } from "@/lib/booking/admin-forms";
import type { Product } from "@/types/shop";
import { productIdSchema, productImageSchema } from "./schemas";

type Form = Pick<FormData, "get">;

const text = (form: Form, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const formSchema = z.object({
  name: z.string().min(1, "Enter a name").max(100),
  id: productIdSchema,
  category: z.string().max(60),
  description: z.string().max(2000),
  price: z
    .string()
    .refine((v) => poundsToPence(v) !== null, "Enter a price like 12 or 12.50"),
  order: z.coerce.number("Enter a number").int().min(0).max(9999),
  media: z
    .array(productImageSchema, "Upload the photos again")
    .max(12, "At most 12 photos per product"),
});

export type ProductFormValue = Omit<Product, "createdAt" | "updatedAt">;

// "media" is a JSON array maintained by the photo manager in the form.
// The id comes from the slug field on create and is fixed on update.
export function parseProductForm(
  form: Form,
  existingId?: string,
): Parsed<ProductFormValue> {
  let media: unknown;
  try {
    media = JSON.parse(text(form, "media") || "[]");
  } catch {
    return { ok: false, fieldErrors: { media: ["Upload the photos again"] } };
  }

  const parsed = formSchema.safeParse({
    name: text(form, "name"),
    id: existingId ?? (text(form, "slug") || slugify(text(form, "name"))),
    category: text(form, "category"),
    description: text(form, "description"),
    price: text(form, "price"),
    order: text(form, "order") || "0",
    media,
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    // The id is edited through the "slug" field.
    const { id, ...rest } = fieldErrors;
    return { ok: false, fieldErrors: id ? { ...rest, slug: id } : rest };
  }

  const { price, ...value } = parsed.data;
  const published = form.get("published") === "on";
  if (published && value.media.length === 0) {
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
      pricePence: poundsToPence(price)!,
      coverPublicId: value.media.some((m) => m.publicId === cover)
        ? cover
        : undefined,
      inStock: form.get("inStock") === "on",
      featured: form.get("featured") === "on",
      published,
    },
  };
}
