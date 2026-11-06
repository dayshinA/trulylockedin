"use client";

import { useRef, useState } from "react";

import { checkUpload, formatMegabytes, uploadHint } from "@/lib/media/limits";
import { UploadError, uploadMedia, type UploadedAsset } from "@/lib/media/upload";
import { outlineButton, smallButton } from "./admin-ui";
import { FieldError } from "@/components/forms/field-error";

const CONCURRENT_UPLOADS = 3;

type Job = {
  id: number;
  file: File;
  status: "waiting" | "uploading" | "failed";
  progress: number;
  error?: string;
  retryable?: boolean;
};

// Picks files with the phone's own picker (library or camera) and uploads them
// straight to Cloudinary. Files that are too big or the wrong format are
// refused before uploading; each file shows its progress or what went wrong.
// Finished files leave the list and are handed to onUploaded.
export function UploadButton({
  label,
  videos,
  multiple,
  onUploaded,
}: {
  label: string;
  videos: boolean;
  multiple: boolean;
  onUploaded: (asset: UploadedAsset) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const [jobs, setJobs] = useState<Job[]>([]);

  function update(id: number, patch: Partial<Job>) {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
  }

  function dismiss(id: number) {
    setJobs((current) => current.filter((job) => job.id !== id));
  }

  async function run(job: Job) {
    update(job.id, { status: "uploading", progress: 0, error: undefined });
    try {
      const asset = await uploadMedia(job.file, (progress) =>
        update(job.id, { progress }),
      );
      dismiss(job.id);
      onUploaded(asset);
    } catch (error) {
      update(job.id, {
        status: "failed",
        error:
          error instanceof UploadError
            ? error.message
            : `${job.file.name} couldn't be uploaded. Try again.`,
        retryable: error instanceof UploadError ? error.retryable : true,
      });
    }
  }

  async function pick(files: File[]) {
    const added: Job[] = files.map((file) => {
      const check = checkUpload(file, videos);
      return check.ok
        ? { id: nextId.current++, file, status: "waiting", progress: 0 }
        : {
            id: nextId.current++,
            file,
            status: "failed",
            progress: 0,
            error: check.message,
            retryable: false,
          };
    });
    setJobs((current) => [...current, ...added]);

    const queue = added.filter((job) => job.status === "waiting");
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await run(job);
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENT_UPLOADS, queue.length) }, worker),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        hidden
        multiple={multiple}
        accept={videos ? "image/*,video/*" : "image/*"}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // Cleared so picking the same file again still fires a change.
          e.target.value = "";
          if (files.length > 0) void pick(files);
        }}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={outlineButton}
        >
          {label}
        </button>
        <p className="text-xs text-muted">{uploadHint(videos)}</p>
      </div>
      {jobs.length > 0 && (
        <ul className="border-t border-line" aria-live="polite">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-col gap-2 border-b border-line py-3"
            >
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink">
                  {job.file.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatMegabytes(job.file.size)}
                </span>
              </p>
              {job.status === "failed" ? (
                <>
                  <FieldError live>{job.error}</FieldError>
                  <div className="flex flex-wrap gap-2">
                    {job.retryable && (
                      <button
                        type="button"
                        onClick={() => void run(job)}
                        className={smallButton}
                      >
                        Try again
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dismiss(job.id)}
                      className={smallButton}
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${job.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(job.progress * 100)}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-line"
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-[width]"
                      style={{ width: `${job.progress * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-muted">
                    {job.status === "waiting"
                      ? "Waiting…"
                      : job.progress < 1
                        ? `${Math.round(job.progress * 100)}%`
                        : "Finishing…"}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
