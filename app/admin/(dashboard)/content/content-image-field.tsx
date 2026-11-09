"use client";

import { CldImage } from "next-cloudinary";
import { useRef, useState } from "react";

import { FieldError } from "@/components/forms/field-error";
import type { ContentImage } from "@/types/cms";
import { inputClass } from "../_components/admin-form";
import { outlineButton } from "../_components/admin-ui";
import { discardUploadsAction } from "../_components/media-actions";
import { UploadButton } from "../_components/upload-button";

// One ordinary photo in a content section, posted as <name>PublicId,
// <name>Width, <name>Height and <name>Alt (see parseHomeForm). The save action
// deletes the old photo once replaced or removed; a photo uploaded and then
// replaced before saving is discarded straight away (kept if something saved
// still uses it).
export function ContentImageField({
  name,
  legend,
  initial,
  error,
  emptyText,
  help,
}: {
  name: string;
  legend: string;
  initial?: ContentImage;
  error?: string[];
  emptyText: string;
  help: string;
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
      <legend className="mb-2 text-sm text-muted">{legend}</legend>
      <input type="hidden" name={`${name}PublicId`} value={image?.publicId ?? ""} />
      <input type="hidden" name={`${name}Width`} value={image?.width ?? ""} />
      <input type="hidden" name={`${name}Height`} value={image?.height ?? ""} />
      {image ? (
        <>
          <CldImage
            src={image.publicId}
            width={480}
            height={Math.round((480 * image.height) / image.width)}
            alt=""
            className="h-auto w-full max-w-60 rounded-sm"
          />
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted">
              Describe the photo (for screen readers)
            </span>
            <input
              name={`${name}Alt`}
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
            Remove photo
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
      {error?.[0] && <FieldError>{error[0]}</FieldError>}
      <UploadButton
        label={image ? "Replace photo" : "Upload a photo"}
        videos={false}
        multiple={false}
        onUploaded={({ publicId, width, height }) =>
          change({ publicId, width, height, alt: image?.alt ?? "" })
        }
      />
      <p className="text-xs text-muted">{help}</p>
    </fieldset>
  );
}
