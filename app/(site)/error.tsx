"use client";

import { useEffect } from "react";

import { StatusPage } from "@/components/site/status-page";

// Unexpected errors on public pages. Production hides the message; the digest
// matches the server log.
export default function SiteError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      title="Something went wrong"
      text="Sorry, this page didn't load properly. Please try again. If it keeps happening, get in touch and we'll sort it out."
      actions={[
        { label: "Try again", onClick: retry },
        { label: "Home", href: "/" },
        { label: "Contact", href: "/contact" },
      ]}
    />
  );
}
