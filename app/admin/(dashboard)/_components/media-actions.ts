"use server";

import { z } from "zod";

import { verifyAdmin } from "@/lib/auth/dal";
import { destroyMedia, listFolderAssets } from "@/lib/cloudinary";
import { mediaPublicIdSchema } from "@/lib/media/folder";
import { findOrphans } from "@/lib/media/orphans";
import { referencedPublicIds } from "@/lib/media/references";

const discardInput = z
  .array(
    z.object({
      publicId: mediaPublicIdSchema,
      type: z.enum(["image", "video"]),
    }),
  )
  .max(30);

// Uploads removed from a form before ever being saved. Anything a saved look
// or service still uses is kept.
export async function discardUploadsAction(media: unknown) {
  await verifyAdmin();
  const parsed = discardInput.safeParse(media);
  if (!parsed.success || parsed.data.length === 0) return;
  const inUse = await referencedPublicIds();
  await destroyMedia(parsed.data.filter((m) => !inUse.has(m.publicId)));
}

export type UnusedUploads =
  | { status: "ok"; count: number; bytes: number }
  | { status: "error"; message: string };

async function unused() {
  const [assets, inUse] = await Promise.all([
    listFolderAssets(),
    referencedPublicIds(),
  ]);
  return findOrphans(assets, inUse, new Date());
}

export async function findUnusedUploadsAction(): Promise<UnusedUploads> {
  await verifyAdmin();
  try {
    const orphans = await unused();
    return {
      status: "ok",
      count: orphans.length,
      bytes: orphans.reduce((sum, o) => sum + o.bytes, 0),
    };
  } catch (error) {
    console.error("Listing uploads failed", error);
    return { status: "error", message: "Couldn't check storage. Try again." };
  }
}

// Recomputes the list rather than trusting one sent from the browser.
export async function deleteUnusedUploadsAction(): Promise<UnusedUploads> {
  await verifyAdmin();
  try {
    const orphans = await unused();
    await destroyMedia(orphans);
    return {
      status: "ok",
      count: orphans.length,
      bytes: orphans.reduce((sum, o) => sum + o.bytes, 0),
    };
  } catch (error) {
    console.error("Deleting unused uploads failed", error);
    return { status: "error", message: "Couldn't clean up storage. Try again." };
  }
}
