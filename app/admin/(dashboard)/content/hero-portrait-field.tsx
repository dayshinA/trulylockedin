"use client";

import { CldImage } from "next-cloudinary";
import { useRef, useState } from "react";

import type { ContentImage } from "@/types/cms";
import { inputClass } from "../_components/admin-form";
import { outlineButton } from "../_components/admin-ui";
import { discardUploadsAction } from "../_components/media-actions";
import { UploadButton } from "../_components/upload-button";
import { FieldError } from "@/components/forms/field-error";

// The cut-out over the burgundy disc on the home page. The save action deletes the old
// photo once replaced or removed; a photo uploaded and replaced before saving
// is discarded straight away (kept if something saved still uses it).
export function HeroPortraitField({
  initial,
  error,
}: {
  initial?: ContentImage;
  error?: string[];
}) {
  const [image, setImage] = useState(initial);
  const unsaved = useRef<string | undefined>(undefined);

  function change(next: ContentImage | undefined) {
    if (unsaved.current && unsaved.current !== next?.publicId) {
      void discardUploadsAction([{ publicId: unsaved.current, type: "image" }]);
    }
    unsaved.current =
      next && next.publicId !== initial?.publicId ? next.publicId : undefined;
    setImage(next);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm text-muted">Cut-out portrait</legend>
      <input type="hidden" name="portraitPublicId" value={image?.publicId ?? ""} />
      <input type="hidden" name="portraitWidth" value={image?.width ?? ""} />
      <input type="hidden" name="portraitHeight" value={image?.height ?? ""} />
      {image ? (
        <>
          <CldImage
            src={image.publicId}
            width={320}
            height={400}
            crop="fit"
            alt=""
            className="aspect-4/5 w-full max-w-60 rounded-sm bg-brand object-contain"
          />
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">Describe the photo (for screen readers)</span>
            <input
              name="portraitAlt"
              value={image.alt}
              onChange={(e) => setImage({ ...image, alt: e.target.value })}
              placeholder="e.g. Client with shoulder-length locs"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={() => change(undefined)}
            className={`${outlineButton} hover:border-ink hover:text-ink`}
          >
            Remove portrait
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">
          No portrait uploaded. The home page is showing the default portrait.
        </p>
      )}
      {error?.[0] && <FieldError>{error[0]}</FieldError>}
      <UploadButton
        label={image ? "Replace portrait" : "Upload a portrait"}
        videos={false}
        multiple={false}
        onUploaded={({ publicId, width, height }) =>
          change({ publicId, width, height, alt: image?.alt ?? "" })
        }
      />
      <p className="text-xs text-muted">
        This is the person shown in the burgundy circle at the top of the home
        page. Use a picture with the background already removed (a PNG or
        WebP, e.g. made with a background-remover app): a normal photo will
        show as a rectangle. Head and shoulders, with the hair touching the top
        edge and the face in the middle, works best.
      </p>
    </fieldset>
  );
}
