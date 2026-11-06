"use client";

import { useState, useTransition } from "react";

import { ORPHAN_GRACE_HOURS } from "@/lib/media/orphans";
import {
  deleteUnusedUploadsAction,
  findUnusedUploadsAction,
  type UnusedUploads,
} from "../_components/media-actions";
import { dangerButton, outlineButton } from "../_components/admin-ui";
import { FormNotice } from "@/components/forms/field-error";

const megabytes = (bytes: number) =>
  `${(bytes / 1_000_000).toLocaleString("en-GB", { maximumFractionDigits: 1 })} MB`;

const files = (count: number) => (count === 1 ? "1 file" : `${count} files`);

// Two steps: check first, then confirm. The server recomputes the list on
// delete, so nothing saved since the check can be removed.
export function StorageCleanup() {
  const [pending, startTransition] = useTransition();
  const [found, setFound] = useState<UnusedUploads | null>(null);
  const [message, setMessage] = useState<string>();

  function check() {
    setMessage(undefined);
    startTransition(async () => setFound(await findUnusedUploadsAction()));
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteUnusedUploadsAction();
      setFound(null);
      setMessage(
        result.status === "ok"
          ? `Deleted ${files(result.count)} (${megabytes(result.bytes)}).`
          : result.message,
      );
    });
  }

  return (
    <section className="mt-6 flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="font-display text-3xl font-semibold">Storage clean-up</h2>
      <p className="text-sm text-muted">
        Your photo storage has a free limit. If you upload a photo and then
        leave the page without saving, the file is left behind, unused. This
        finds those files so you can delete them. It never touches anything
        that&rsquo;s on the website, and leaves uploads from the last{" "}
        {ORPHAN_GRACE_HOURS} hours alone. Running it every few months is
        plenty.
      </p>
      {found?.status === "ok" && found.count === 0 && (
        <p role="status" className="text-sm text-brand">
          Nothing to clean up.
        </p>
      )}
      {found?.status === "error" && (
        <FormNotice>{found.message}</FormNotice>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      {found?.status === "ok" && found.count > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {files(found.count)} unused ({megabytes(found.bytes)}). This
            can&apos;t be undone.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className={dangerButton}
            >
              {pending ? "Deleting…" : `Delete ${files(found.count)}`}
            </button>
            <button
              type="button"
              onClick={() => setFound(null)}
              disabled={pending}
              className={outlineButton}
            >
              Keep them
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={check} disabled={pending} className={outlineButton}>
          {pending ? "Checking…" : "Check for unused uploads"}
        </button>
      )}
    </section>
  );
}
