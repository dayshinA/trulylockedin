"use client";

import { CircleHelp, Lightbulb, TriangleAlert, X } from "lucide-react";
import { useSyncExternalStore } from "react";

// Plain-language help for the owner, who isn't technical.
//
// PageGuide: the "How this page works" box at the top of a page. It starts
// open; "Got it" folds it into a small link and that choice is remembered in
// this browser (localStorage, with an in-memory fallback when storage is
// blocked). The server always renders it open, so a first-time visitor sees
// it before the page has loaded its scripts.
//
// Tip: a short note beside a setting, saying what changing it does.
// tone="warning" is for anything that affects clients or money.

const KEY_PREFIX = "tli-admin-guide-hidden:";
const memory = new Map<string, boolean>();
const listeners = new Set<() => void>();

function readHidden(id: string): boolean {
  try {
    return window.localStorage.getItem(KEY_PREFIX + id) === "1";
  } catch {
    return memory.get(id) ?? false;
  }
}

function writeHidden(id: string, hidden: boolean) {
  memory.set(id, hidden);
  try {
    if (hidden) window.localStorage.setItem(KEY_PREFIX + id, "1");
    else window.localStorage.removeItem(KEY_PREFIX + id);
  } catch {
    // Storage blocked (private window): the in-memory value is used instead.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function PageGuide({
  id,
  title = "How this page works",
  children,
  footer,
}: {
  /** Unique per page, e.g. "bookings". Used to remember "Got it". */
  id: string;
  title?: string;
  /** The points, each in its own <li>. */
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const hidden = useSyncExternalStore(
    subscribe,
    () => readHidden(id),
    () => false,
  );

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => writeHidden(id, false)}
        className="-ml-1 inline-flex min-h-11 w-fit items-center gap-2 px-1 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
      >
        <CircleHelp aria-hidden className="size-4" />
        {title}
      </button>
    );
  }

  return (
    <aside
      aria-label={title}
      className="flex flex-col gap-3 border-l-2 border-brand bg-surface px-5 py-4 text-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <CircleHelp aria-hidden className="size-5 shrink-0 text-brand" />
          {title}
        </h2>
        <button
          type="button"
          onClick={() => writeHidden(id, true)}
          aria-label="Hide this help"
          className="-mt-1 -mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-ink/80">
        {children}
      </ul>
      {footer && <div className="text-muted">{footer}</div>}
      <button
        type="button"
        onClick={() => writeHidden(id, true)}
        className="inline-flex min-h-11 w-fit items-center rounded-full border border-brand px-5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-on-brand"
      >
        Got it, hide this
      </button>
    </aside>
  );
}

export function Tip({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: React.ReactNode;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Lightbulb;
  return (
    <p
      className={`flex items-start gap-2 rounded-sm px-3 py-2.5 text-sm ${
        tone === "warning"
          ? "border-l-4 border-ink bg-ink/5 text-ink"
          : "bg-surface text-ink/80"
      }`}
    >
      <Icon
        aria-hidden
        className={`mt-0.5 size-4 shrink-0 ${tone === "warning" ? "text-ink" : "text-brand"}`}
      />
      <span>{children}</span>
    </p>
  );
}
