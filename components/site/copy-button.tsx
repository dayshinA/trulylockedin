"use client";

import { useState } from "react";

// Copies a short text (e.g. a booking or order reference).
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard blocked: the text is still on screen to copy by hand.
        }
      }}
      className="inline-flex min-h-11 items-center rounded-full border border-field px-5 text-sm font-semibold text-ink transition-colors hover:border-brand"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
