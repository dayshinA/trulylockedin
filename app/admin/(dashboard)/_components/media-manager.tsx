"use client";

import { CldImage } from "next-cloudinary";
import { useEffect, useRef, useState } from "react";

import type { UploadedAsset } from "@/lib/media/upload";
import { coverOf } from "@/lib/portfolio/media";
import type { PortfolioMedia } from "@/types/portfolio";
import { inputClass } from "./admin-form";
import { Badge, smallButton } from "./admin-ui";
import type { FormState } from "./form-state";
import { discardUploadsAction } from "./media-actions";
import { UploadButton } from "./upload-button";

// Upload, order, describe and pick a cover for a list of media (looks and
// products). Posts the list as JSON in "media" and the cover in
// "coverPublicId"; the form's parser validates both.
export function MediaManager({
  initial = [],
  initialCover,
  state,
  error,
  videos,
  legend,
}: {
  initial?: PortfolioMedia[];
  initialCover?: string;
  // The form's last result: once saved, uploads belong to the record.
  state: FormState;
  error?: string[];
  videos: boolean;
  legend: string;
}) {
  const [media, setMedia] = useState<PortfolioMedia[]>(initial);
  const [coverId, setCoverId] = useState(
    initial.length > 0
      ? coverOf({ media: initial, coverPublicId: initialCover })?.publicId
      : undefined,
  );
  // Uploaded in this visit and not yet saved: safe to delete if removed again.
  const unsaved = useRef(new Set<string>());
  useEffect(() => {
    if (state.status === "success") unsaved.current.clear();
  }, [state]);

  function addUpload({ publicId, type, width, height }: UploadedAsset) {
    unsaved.current.add(publicId);
    setMedia((current) => [
      ...current,
      { publicId, type, width, height, alt: "" },
    ]);
  }

  function move(index: number, by: -1 | 1) {
    setMedia((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  function remove(target: PortfolioMedia) {
    setMedia((current) =>
      current.filter((m) => m.publicId !== target.publicId),
    );
    if (coverId === target.publicId) setCoverId(undefined);
    if (unsaved.current.has(target.publicId)) {
      unsaved.current.delete(target.publicId);
      void discardUploadsAction([
        { publicId: target.publicId, type: target.type },
      ]);
    }
  }

  function setAlt(publicId: string, alt: string) {
    setMedia((current) =>
      current.map((m) => (m.publicId === publicId ? { ...m, alt } : m)),
    );
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 text-sm text-sand">{legend}</legend>
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      <input type="hidden" name="coverPublicId" value={coverId ?? ""} />
      {media.length === 0 ? (
        <p className="text-sm text-sand">Nothing uploaded yet.</p>
      ) : (
        <ul className="border-t border-brown">
          {media.map((m, i) => (
            <li
              key={m.publicId}
              className="flex flex-wrap items-start gap-4 border-b border-brown py-4"
            >
              <CldImage
                src={m.publicId}
                assetType={m.type}
                width={96}
                height={96}
                crop="fill"
                alt=""
                className="size-24 shrink-0 rounded-sm object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="flex items-center gap-2 text-xs text-sand">
                  {m.type === "video" ? "Video" : "Photo"}
                  {coverId === m.publicId && <Badge tone="accent">Cover</Badge>}
                </p>
                <input
                  aria-label="Description for screen readers"
                  placeholder="Describe the photo (for screen readers)"
                  value={m.alt}
                  onChange={(e) => setAlt(m.publicId, e.target.value)}
                  className={`${inputClass} text-sm`}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className={smallButton}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === media.length - 1}
                    className={smallButton}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  {coverId !== m.publicId && (
                    <button
                      type="button"
                      onClick={() => setCoverId(m.publicId)}
                      className={smallButton}
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className={`${smallButton} hover:border-burgundy hover:text-cream`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error?.[0] && <p className="text-sm text-gold-light">{error[0]}</p>}
      <UploadButton
        label={videos ? "Upload photos or videos" : "Upload photos"}
        videos={videos}
        multiple
        onUploaded={addUpload}
      />
      <p className="text-xs text-sand">
        Removed photos are deleted from storage when you save.
      </p>
    </fieldset>
  );
}
