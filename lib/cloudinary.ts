import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { MEDIA_FOLDER, type MediaRef } from "@/lib/media/folder";
import type { UploadKind } from "@/lib/media/limits";
import type { StoredAsset } from "@/lib/media/orphans";

let configured = false;

function client() {
  if (!configured) {
    const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error("Cloudinary is not configured: check .env.local");
    }
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
    configured = true;
  }
  return cloudinary;
}

export function uploadPreset(): string {
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!preset)
    throw new Error("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not set");
  return preset;
}

// The preset for clients' booking reference photos (authenticated delivery,
// own folder; see lib/booking/reference-photos.ts).
export function referencePreset(): string {
  const preset = process.env.CLOUDINARY_REFERENCE_PRESET;
  if (!preset) throw new Error("CLOUDINARY_REFERENCE_PRESET is not set");
  return preset;
}

// Fields for one signed upload straight from the browser. Only the timestamp
// and the preset are signed, so the preset alone decides folder, naming and
// delivery type. The signature is valid for an hour.
export function signUpload(
  kind: UploadKind,
  preset: string = uploadPreset(),
): {
  url: string;
  fields: Record<string, string>;
} {
  const { cloud_name, api_key, api_secret } = client().config();
  const params = {
    timestamp: Math.round(Date.now() / 1000),
    upload_preset: preset,
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud_name}/${kind}/upload`,
    fields: {
      api_key: api_key!,
      timestamp: String(params.timestamp),
      upload_preset: params.upload_preset,
      signature: client().utils.api_sign_request(params, api_secret!),
    },
  };
}

// Best effort: a failed delete only leaves an orphaned file in Cloudinary, so
// it is logged rather than failing the save the owner just made.
export async function destroyMedia(media: MediaRef[]): Promise<void> {
  for (const type of ["image", "video"] as const) {
    const ids = media.filter((m) => m.type === type).map((m) => m.publicId);
    if (ids.length === 0) continue;
    try {
      await client().api.delete_resources(ids, {
        resource_type: type,
        invalidate: true,
      });
    } catch (error) {
      console.error("Cloudinary delete failed", ids, error);
    }
  }
}

type SearchResult = {
  resources: {
    public_id: string;
    resource_type: string;
    created_at: string;
    bytes: number;
  }[];
  next_cursor?: string;
};

// Reference photos are "authenticated" assets, which need the type to delete.
export async function destroyReferencePhotos(
  publicIds: string[],
): Promise<boolean> {
  if (publicIds.length === 0) return true;
  try {
    await client().api.delete_resources(publicIds, {
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
    return true;
  } catch (error) {
    console.error("Cloudinary delete failed", publicIds, error);
    return false;
  }
}

// A signed URL for a reference photo, at most `width` wide. The signature never
// expires, so it is only ever fetched by the server and never sent to a browser.
export function referencePhotoUrl(publicId: string, width: number): string {
  return client().url(publicId, {
    type: "authenticated",
    resource_type: "image",
    sign_url: true,
    secure: true,
    transformation: [
      { width, crop: "limit" },
      { fetch_format: "auto", quality: "auto" },
    ],
  });
}

// Everything in an upload folder (default: the portfolio/service one), images
// and videos. Uses the Search API, whose index can lag a new upload by a few
// seconds.
export async function listFolderAssets(
  folder: string = MEDIA_FOLDER,
): Promise<StoredAsset[]> {
  const assets: StoredAsset[] = [];
  let cursor: string | undefined;
  do {
    let query = client()
      .search.expression(`asset_folder="${folder}"`)
      .max_results(500);
    if (cursor) query = query.next_cursor(cursor);
    const page = (await query.execute()) as SearchResult;
    for (const r of page.resources) {
      if (r.resource_type !== "image" && r.resource_type !== "video") continue;
      assets.push({
        publicId: r.public_id,
        type: r.resource_type,
        createdAt: r.created_at,
        bytes: r.bytes,
      });
    }
    cursor = page.next_cursor;
  } while (cursor);
  return assets;
}
