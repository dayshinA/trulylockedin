"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PageHeader, primaryButton, textLink } from "./_components/admin-ui";

// Unexpected errors in the admin (for example Firestore unreachable).
export default function AdminError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest =
    error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <PageHeader eyebrow="Error" title="Something went wrong">
      <p>
        This page didn&apos;t load. Your changes up to the last save are kept.
        Try again, and if it keeps happening, send the developer the code below.
      </p>
      {digest && <p className="mt-2 text-sm">Error code: {digest}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <button type="button" onClick={retry} className={primaryButton}>
          Try again
        </button>
        <Link href="/admin" className={textLink}>
          Back to overview
        </Link>
      </div>
    </PageHeader>
  );
}
