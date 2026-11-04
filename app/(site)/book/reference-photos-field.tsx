"use client";

import { ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  MAX_REFERENCE_PHOTOS,
  REFERENCE_RETENTION_DAYS,
} from "@/lib/booking/reference-photos";
import {
  checkUpload,
  formatMegabytes,
  MAX_UPLOAD_BYTES,
} from "@/lib/media/limits";
import { UploadError, uploadMedia } from "@/lib/media/upload";

const SIGN_URL = "/api/booking/reference-photo/sign";

export type ReferencePhoto = {
  key: number;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "failed";
  progress: number;
  publicId?: string;
  error?: string;
  retryable?: boolean;
};

export const uploadedPhotoIds = (photos: ReferencePhoto[]) =>
  photos.flatMap((p) => (p.status === "done" && p.publicId ? [p.publicId] : []));

export const photosBusy = (photos: ReferencePhoto[]) =>
  photos.some((p) => p.status === "uploading");

// Optional photos for the stylist: the look the client wants, or their hair as
// it is now. Each one uploads as soon as it's picked; the booking only sends the
// finished uploads' ids. State lives in BookingFlow so a sign-in mid-form
// (which remounts the form) keeps the photos.
export function ReferencePhotosField({
  photos,
  setPhotos,
  error,
}: {
  photos: ReferencePhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<ReferencePhoto[]>>;
  error?: string[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const nextKey = useRef(0);
  const [pickError, setPickError] = useState<string | null>(null);
  const room = MAX_REFERENCE_PHOTOS - photos.length;

  function update(key: number, patch: Partial<ReferencePhoto>) {
    setPhotos((current) =>
      current.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
  }

  async function upload(key: number, file: File) {
    update(key, { status: "uploading", progress: 0, error: undefined });
    try {
      const asset = await uploadMedia(
        file,
        (progress) => update(key, { progress }),
        SIGN_URL,
      );
      update(key, { status: "done", progress: 1, publicId: asset.publicId });
    } catch (e) {
      update(key, {
        status: "failed",
        error:
          e instanceof UploadError
            ? e.message
            : "That photo couldn't be uploaded. Try again.",
        retryable: e instanceof UploadError ? e.retryable : true,
      });
    }
  }

  function pick(files: File[]) {
    setPickError(null);
    const accepted: ReferencePhoto[] = [];
    for (const file of files) {
      const check = checkUpload(file, false);
      if (!check.ok) {
        setPickError(check.message);
        continue;
      }
      if (accepted.length >= room) {
        setPickError(`You can add up to ${MAX_REFERENCE_PHOTOS} photos.`);
        break;
      }
      accepted.push({
        key: nextKey.current++,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
        progress: 0,
      });
    }
    if (accepted.length === 0) return;
    setPhotos((current) => [...current, ...accepted]);
    for (const photo of accepted) void upload(photo.key, photo.file);
  }

  function remove(photo: ReferencePhoto) {
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) => current.filter((p) => p.key !== photo.key));
    // An upload that's no longer wanted is deleted by the daily clean-up.
  }

  const message = pickError ?? error?.[0];

  return (
    <fieldset className="flex flex-col gap-3 text-sm">
      <legend className="mb-2 text-muted">Reference picture (optional)</legend>
      <p className="-mt-1 text-muted">
        Got a look in mind? Add a photo of the style you&rsquo;d like, or of
        your hair as it is now, so we can plan your appointment and set aside
        the right time. Up to {MAX_REFERENCE_PHOTOS} photos,{" "}
        {formatMegabytes(MAX_UPLOAD_BYTES.image)} each. Only the salon sees
        them, and they&rsquo;re deleted {REFERENCE_RETENTION_DAYS} days after
        your appointment.
      </p>

      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // Cleared so picking the same file again still fires a change.
          e.target.value = "";
          if (files.length > 0) pick(files);
        }}
      />

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3" aria-live="polite">
          {photos.map((photo) => (
            <li key={photo.key} className="flex min-w-0 flex-col gap-1">
              <div className="relative aspect-square overflow-hidden rounded-sm bg-surface">
                <Preview photo={photo} />
                {photo.status === "uploading" && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-page/70">
                    <div
                      className="h-full bg-brand transition-[width]"
                      style={{ width: `${Math.round(photo.progress * 100)}%` }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(photo)}
                  aria-label={`Remove ${photo.file.name}`}
                  className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-page/90 text-ink shadow-sm transition-colors hover:bg-page"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              {photo.status === "uploading" && (
                <span className="text-xs text-muted">Uploading…</span>
              )}
              {photo.status === "failed" && (
                <span className="text-xs font-semibold text-brand">
                  {photo.error}{" "}
                  {photo.retryable && (
                    <button
                      type="button"
                      onClick={() => void upload(photo.key, photo.file)}
                      className="underline underline-offset-2"
                    >
                      Try again
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {room > 0 && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-field px-5 text-sm font-semibold text-ink transition-colors hover:border-brand"
        >
          <ImageIcon className="size-4" aria-hidden />
          {photos.length === 0 ? "Add a photo" : "Add another photo"}
        </button>
      )}

      {message && (
        <span role="alert" className="font-semibold text-brand">
          {message}
        </span>
      )}
    </fieldset>
  );
}

// Browsers that can't show the file (e.g. HEIC outside Safari) get an icon.
function Preview({ photo }: { photo: ReferencePhoto }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted">
        <ImageIcon className="size-6" aria-hidden />
        <span className="w-full truncate">{photo.file.name}</span>
      </div>
    );
  }
  return (
    // A local blob preview: next/image can't optimise it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.previewUrl}
      alt={`Your photo ${photo.file.name}`}
      onError={() => setBroken(true)}
      className="h-full w-full object-cover"
    />
  );
}
