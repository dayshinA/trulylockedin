import "server-only";

import { destroyReferencePhotos, listFolderAssets } from "@/lib/cloudinary";
import { findOrphans, ORPHAN_GRACE_HOURS } from "@/lib/media/orphans";
import {
  REFERENCE_FOLDER,
  REFERENCE_RETENTION_DAYS,
} from "./reference-photos";
import { bookingRepository } from "./server";
import { addDays, todayLocal } from "./time";

// Deletes clients' reference photos that are no longer needed:
// - photos on bookings that were cancelled, or whose appointment date is more
//   than REFERENCE_RETENTION_DAYS ago;
// - uploads never attached to a booking (the client left the form), once
//   they're ORPHAN_GRACE_HOURS old.
// There's no scheduler, so this runs in the background while the owner uses
// the admin (see maybeCleanUpReferencePhotos).
export async function cleanUpReferencePhotos(now: Date): Promise<number> {
  const repo = bookingRepository();
  const [settings, bookings] = await Promise.all([
    repo.getSettings(),
    repo.listBookingsWithReferencePhotos(),
  ]);
  const keepFrom = addDays(
    todayLocal(now, settings.timezone),
    -REFERENCE_RETENTION_DAYS,
  );

  let deleted = 0;
  const kept = new Set<string>();
  for (const booking of bookings) {
    const photos = booking.referencePhotos ?? [];
    if (booking.status !== "cancelled" && booking.date >= keepFrom) {
      for (const id of photos) kept.add(id);
      continue;
    }
    // Only forget the photos once Cloudinary has deleted them.
    if (await destroyReferencePhotos(photos)) {
      await repo.clearReferencePhotos(booking.id);
      deleted += photos.length;
    } else {
      for (const id of photos) kept.add(id);
    }
  }

  const orphans = findOrphans(
    await listFolderAssets(REFERENCE_FOLDER),
    kept,
    now,
    ORPHAN_GRACE_HOURS,
    REFERENCE_FOLDER,
  ).map((asset) => asset.publicId);
  if (await destroyReferencePhotos(orphans)) deleted += orphans.length;
  return deleted;
}

const EVERY_MS = 6 * 3_600_000;
let lastRun = 0;

// At most every 6 hours per server process; never throws.
export async function maybeCleanUpReferencePhotos(): Promise<void> {
  const now = new Date();
  if (now.getTime() - lastRun < EVERY_MS) return;
  lastRun = now.getTime();
  try {
    const deleted = await cleanUpReferencePhotos(now);
    if (deleted > 0) console.info(`Deleted ${deleted} old reference photos`);
  } catch (error) {
    console.error("Reference photo clean-up failed", error);
  }
}
