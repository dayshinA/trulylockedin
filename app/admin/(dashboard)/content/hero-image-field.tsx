"use client";

import { CldImage } from "next-cloudinary";
import { useRef, useState } from "react";

import type { ContentImage } from "@/types/cms";
import { inputClass } from "../_components/admin-form";
import { outlineButton } from "../_components/admin-ui";
import { discardUploadsAction } from "../_components/media-actions";
import { UploadButton } from "../_components/upload-button";

// The photo beside the home page headline. The save action deletes the old
// photo once replaced or removed; a photo uploaded and replaced before saving
// is discarded straight away (kept if something saved still uses it).
export function HeroImageField({
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
      <legend className="mb-2 text-sm text-sand">Photo beside the headline</legend>
      <input type="hidden" name="imagePublicId" value={image?.publicId ?? ""} />
      <input type="hidden" name="imageWidth" value={image?.width ?? ""} />
      <input type="hidden" name="imageHeight" value={image?.height ?? ""} />
      {image ? (
        <>
          <CldImage
            src={image.publicId}
            width={320}
            height={400}
            crop="fill"
            gravity="auto"
            alt=""
            className="aspect-4/5 w-full max-w-60 rounded-sm object-cover"
          />
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-sand">Describe the photo (for screen readers)</span>
            <input
              name="imageAlt"
              value={image.alt}
              onChange={(e) => setImage({ ...image, alt: e.target.value })}
              placeholder="e.g. Fresh retwist on shoulder-length locs"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={() => change(undefined)}
            className={`${outlineButton} hover:border-burgundy hover:text-cream`}
          >
            Remove photo
          </button>
        </>
      ) : (
        <p className="text-sm text-sand">
          No photo. The panel shows as plain colour.
        </p>
      )}
      {error?.[0] && <p className="text-sm text-gold-light">{error[0]}</p>}
      <UploadButton
        label={image ? "Replace photo" : "Upload a photo"}
        videos={false}
        multiple={false}
        onUploaded={({ publicId, width, height }) =>
          change({ publicId, width, height, alt: image?.alt ?? "" })
        }
      />
      <p className="text-xs text-sand">
        A tall (portrait) photo works best. On phones it&apos;s cropped to fit,
        keeping the main subject in view.
      </p>
    </fieldset>
  );
}
