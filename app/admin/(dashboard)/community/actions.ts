"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { destroyMedia } from "@/lib/cloudinary";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { parsePortfolioForm } from "@/lib/portfolio/forms";
import { removedMedia } from "@/lib/portfolio/media";
import { portfolioIdSchema } from "@/lib/portfolio/schemas";
import { portfolioRepository } from "@/lib/portfolio/server";
import { invalid, type FormState } from "../_components/form-state";

// Create when there's no "id" field; otherwise update that look. Media taken
// out of a look is deleted from Cloudinary after the save succeeds.
export async function savePortfolioAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const rawId = formData.get("id");
  const existingId =
    typeof rawId === "string" && portfolioIdSchema.safeParse(rawId).success
      ? rawId
      : undefined;

  const parsed = parsePortfolioForm(formData, existingId);
  if (!parsed.ok) return invalid(parsed.fieldErrors, parsed.message);

  const repo = portfolioRepository();
  const existing = existingId ? await repo.get(existingId) : null;
  if (existingId && !existing) {
    return { status: "error", message: "This look no longer exists." };
  }

  const now = new Date().toISOString();
  const result = await repo.save(
    { ...parsed.value, createdAt: existing?.createdAt ?? now, updatedAt: now },
    existingId ? "update" : "create",
  );
  if (!result.ok) {
    return result.reason === "exists"
      ? invalid({ slug: ["A look with this web address already exists"] })
      : { status: "error", message: "This look no longer exists." };
  }

  if (result.previous) {
    await destroyMedia(removedMedia(result.previous.media, parsed.value.media));
  }
  updateTag(PUBLIC_TAGS.portfolio);
  if (!existingId) redirect("/admin/community");
  refresh();
  return { status: "success", message: "Saved." };
}

export async function deletePortfolioAction(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id");
  if (typeof id === "string") {
    const deleted = await portfolioRepository().delete(id);
    if (deleted) await destroyMedia(deleted.media);
  }
  updateTag(PUBLIC_TAGS.portfolio);
  redirect("/admin/community");
}
