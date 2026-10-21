import { MEDIA_FOLDER, type MediaRef } from "./folder";

export type StoredAsset = MediaRef & { createdAt: string; bytes: number };

// Uploads younger than this may belong to a form the owner hasn't saved yet.
export const ORPHAN_GRACE_HOURS = 24;

// Files in our folder that no saved look, service or product uses, and that are old
// enough not to be part of an edit in progress.
export function findOrphans(
  assets: StoredAsset[],
  referenced: ReadonlySet<string>,
  now: Date,
  graceHours = ORPHAN_GRACE_HOURS,
): StoredAsset[] {
  const cutoff = now.getTime() - graceHours * 3_600_000;
  return assets.filter(
    (asset) =>
      asset.publicId.startsWith(`${MEDIA_FOLDER}/`) &&
      !referenced.has(asset.publicId) &&
      Date.parse(asset.createdAt) <= cutoff,
  );
}
