"use client";

import "./globals.css";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { StatusPage } from "@/components/site/status-page";

// Last resort when the root layout itself fails. It replaces the whole
// document, so it brings its own <html>, styles and title (the site fonts
// aren't loaded here; the display font falls back to a serif).
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body className="flex min-h-full flex-col font-sans antialiased">
        <title>Something went wrong | TrulyLockedIn</title>
        <StatusPage
          standalone
          title="Something went wrong"
          text="Sorry, the site didn't load properly. Please try again in a moment."
          actions={[
            { label: "Try again", onClick: retry },
            { label: "Home", href: "/" },
          ]}
        />
      </body>
    </html>
  );
}
