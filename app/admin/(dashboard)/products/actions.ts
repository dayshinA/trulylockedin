"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { destroyMedia } from "@/lib/cloudinary";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { referencedPublicIds } from "@/lib/media/references";
import { removedMedia } from "@/lib/portfolio/media";
import { parseProductForm } from "@/lib/shop/forms";
import { productIdSchema } from "@/lib/shop/schemas";
import { productRepository } from "@/lib/shop/server";
import type { PortfolioMedia } from "@/types/portfolio";
import { invalid, type FormState } from "../_components/form-state";

// After the save, and only what nothing else still shows.
async function destroyUnused(media: PortfolioMedia[]) {
  if (media.length === 0) return;
  const inUse = await referencedPublicIds();
  await destroyMedia(media.filter((m) => !inUse.has(m.publicId)));
}

// Create when there's no "id" field; otherwise update that product.
export async function saveProductAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const rawId = formData.get("id");
  const existingId =
    typeof rawId === "string" && productIdSchema.safeParse(rawId).success
      ? rawId
      : undefined;

  const parsed = parseProductForm(formData, existingId);
  if (!parsed.ok) return invalid(parsed.fieldErrors, parsed.message);

  const repo = productRepository();
  const existing = existingId ? await repo.get(existingId) : null;
  if (existingId && !existing) {
    return { status: "error", message: "This product no longer exists." };
  }

  const now = new Date().toISOString();
  const result = await repo.save(
    { ...parsed.value, createdAt: existing?.createdAt ?? now, updatedAt: now },
    existingId ? "update" : "create",
  );
  if (!result.ok) {
    return result.reason === "exists"
      ? invalid({ slug: ["A product with this web address already exists"] })
      : { status: "error", message: "This product no longer exists." };
  }

  if (result.previous) {
    await destroyUnused(
      removedMedia(result.previous.media, parsed.value.media),
    );
  }
  updateTag(PUBLIC_TAGS.products);
  if (!existingId) redirect("/admin/products");
  refresh();
  return { status: "success", message: "Saved." };
}

export async function deleteProductAction(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id");
  if (typeof id === "string") {
    const deleted = await productRepository().delete(id);
    if (deleted) await destroyUnused(deleted.media);
  }
  updateTag(PUBLIC_TAGS.products);
  redirect("/admin/products");
}
