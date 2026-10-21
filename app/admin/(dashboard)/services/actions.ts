"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { parseServiceForm } from "@/lib/booking/admin-forms";
import { docIdSchema } from "@/lib/booking/schemas";
import { bookingRepository } from "@/lib/booking/server";
import { destroyMedia } from "@/lib/cloudinary";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { referencedPublicIds } from "@/lib/media/references";
import { invalid, type FormState } from "../_components/form-state";

// After the save, so a failed save never loses the photo still shown.
async function destroyUnusedImage(publicId: string | undefined) {
  if (!publicId || (await referencedPublicIds()).has(publicId)) return;
  await destroyMedia([{ publicId, type: "image" }]);
}

// Create when there is no "id" field; otherwise update that service.
export async function saveServiceAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const rawId = formData.get("id");
  const existingId =
    typeof rawId === "string" && docIdSchema.safeParse(rawId).success
      ? rawId
      : undefined;

  const parsed = parseServiceForm(formData, existingId);
  if (!parsed.ok) return invalid(parsed.fieldErrors);

  const repo = bookingRepository();
  const previous = existingId ? await repo.getService(existingId) : null;
  const result = await repo.saveService(
    parsed.value,
    existingId ? "update" : "create",
  );
  if (!result.ok) {
    return result.reason === "exists"
      ? invalid({ slug: ["A service with this web address already exists"] })
      : { status: "error", message: "This service no longer exists." };
  }

  if (previous?.imagePublicId !== parsed.value.imagePublicId) {
    await destroyUnusedImage(previous?.imagePublicId);
  }
  updateTag(PUBLIC_TAGS.services);
  if (!existingId) redirect("/admin/services");
  refresh();
  return { status: "success", message: "Saved." };
}

// Existing bookings keep their own copy of the service, so deleting is safe.
export async function deleteServiceAction(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id");
  if (typeof id === "string") {
    const repo = bookingRepository();
    const service = await repo.getService(id);
    await repo.deleteService(id);
    await destroyUnusedImage(service?.imagePublicId);
  }
  updateTag(PUBLIC_TAGS.services);
  redirect("/admin/services");
}
