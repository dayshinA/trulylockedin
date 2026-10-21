import { z } from "zod";

// Upload rules shared by the admin picker and /api/cloudinary/sign. The sizes
// are the Cloudinary Free plan's own caps (it rejects bigger files anyway), so
// raise them here if the plan changes. The formats match the upload preset.
const MB = 1024 * 1024;

export type UploadKind = "image" | "video";

export const MAX_UPLOAD_BYTES: Record<UploadKind, number> = {
  image: 10 * MB,
  video: 100 * MB,
};

const FORMATS: Record<UploadKind, readonly string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif"],
  video: ["mp4", "mov", "webm"],
};

const MIME_FORMATS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

// What the browser tells us about a picked file (also what the sign route
// receives).
export const uploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(100),
  size: z.number().int().nonnegative(),
});
export type UploadFile = z.infer<typeof uploadFileSchema>;

export type UploadCheck =
  | { ok: true; kind: UploadKind }
  | { ok: false; message: string };

export function formatMegabytes(bytes: number): string {
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function uploadHint(videos: boolean): string {
  const photos = `Photos up to ${formatMegabytes(MAX_UPLOAD_BYTES.image)}`;
  return videos
    ? `${photos}, videos up to ${formatMegabytes(MAX_UPLOAD_BYTES.video)}.`
    : `${photos}.`;
}

function kindOf(file: UploadFile): UploadKind | undefined {
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  for (const format of [extension, MIME_FORMATS[file.type]]) {
    if (!format) continue;
    if (FORMATS.image.includes(format)) return "image";
    if (FORMATS.video.includes(format)) return "video";
  }
  return undefined;
}

export function checkUpload(file: UploadFile, videos: boolean): UploadCheck {
  const kind = kindOf(file);
  if (!kind || (kind === "video" && !videos)) {
    return {
      ok: false,
      message: `${file.name} can't be uploaded. Use a JPG, PNG, WebP, HEIC or AVIF photo${videos ? ", or an MP4, MOV or WebM video" : ""}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: `${file.name} is empty.` };
  }
  const max = MAX_UPLOAD_BYTES[kind];
  if (file.size > max) {
    return {
      ok: false,
      message: `${file.name} is ${formatMegabytes(file.size)}. ${kind === "image" ? "Photos" : "Videos"} must be ${formatMegabytes(max)} or smaller.`,
    };
  }
  return { ok: true, kind };
}
