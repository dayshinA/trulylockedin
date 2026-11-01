"use client";

import { CldImage } from "next-cloudinary";
import { useRef, useState } from "react";

import { outlineButton } from "../_components/admin-ui";
import { discardUploadsAction } from "../_components/media-actions";
import { UploadButton } from "../_components/upload-button";

// One optional photo per service. The saved photo is deleted by the save
// action when replaced or removed; a photo uploaded and replaced before
// saving is discarded straight away.
export function ServiceImageField({
  initial,
  error,
}: {
  initial?: string;
  error?: string[];
}) {
  const [publicId, setPublicId] = useState(initial);
  const unsaved = useRef<string | undefined>(undefined);

  function change(next: string | undefined) {
    if (unsaved.current && unsaved.current !== next) {
      void discardUploadsAction([{ publicId: unsaved.current, type: "image" }]);
    }
    unsaved.current = next !== initial ? next : undefined;
    setPublicId(next);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm text-muted">Photo (optional)</legend>
      <input type="hidden" name="imagePublicId" value={publicId ?? ""} />
      {publicId ? (
        <CldImage
          src={publicId}
          width={400}
          height={300}
          crop="fill"
          gravity="auto"
          alt=""
          className="aspect-4/3 w-full max-w-xs rounded-sm object-cover"
        />
      ) : (
        <p className="text-sm text-muted">
          No photo. The service shows as text only.
        </p>
      )}
      {error?.[0] && <p className="text-sm font-semibold text-brand">{error[0]}</p>}
      {publicId && (
        <button
          type="button"
          onClick={() => change(undefined)}
          className={`${outlineButton} hover:border-ink hover:text-ink`}
        >
          Remove photo
        </button>
      )}
      <UploadButton
        label={publicId ? "Replace photo" : "Upload a photo"}
        videos={false}
        multiple={false}
        onUploaded={(asset) => change(asset.publicId)}
      />
    </fieldset>
  );
}
