"use client";

import { useLenis } from "lenis/react";
import { ExternalLink, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import type { TikTokVideo } from "@/types/tiktok";

// The studio's TikTok videos as a grid of covers. Tapping one plays it in
// TikTok's own embedded player, inside a native <dialog> (Escape closes, focus
// returns to the tapped cover). The player iframe only exists while open.
export function TikTokGrid({ videos }: { videos: TikTokVideo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState<TikTokVideo | null>(null);
  const lenis = useLenis();

  function show(video: TikTokVideo, from: HTMLElement) {
    trigger.current = from;
    setOpen(video);
    dialog.current?.showModal();
  }

  // Lock the page behind the player while it's open.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
    };
  }, [open, lenis]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {videos.map((video) => {
          const label = video.title || video.description || "TikTok video";
          return (
            <li key={video.id}>
              <Reveal>
                <button
                  type="button"
                  onClick={(e) => show(video, e.currentTarget)}
                  aria-label={`Play: ${label}`}
                  className="group relative block aspect-[9/16] w-full overflow-hidden rounded-sm bg-surface"
                >
                  {/* TikTok's signed cover link expires after 6 hours, so it
                      can't go through next/image's long-lived cache. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.coverUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-page/90 text-ink">
                      <Play aria-hidden className="size-6 translate-x-0.5" />
                    </span>
                  </span>
                  {label !== "TikTok video" && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-left text-sm leading-snug font-semibold text-white">
                      <span className="line-clamp-2">{label}</span>
                    </span>
                  )}
                </button>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => {
          setOpen(null);
          trigger.current?.focus();
        }}
        onClick={(e) => {
          // A tap on the dark space around the player closes it.
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        aria-label="TikTok video"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-ink/85"
      >
        {open && (
          <div
            className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) dialog.current?.close();
            }}
          >
            <div className="flex w-full max-w-[min(100%,calc((100dvh-9rem)*9/16))] items-center justify-between gap-3">
              <a
                href={open.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline pointer-coarse:underline"
              >
                Watch on TikTok
                <ExternalLink aria-hidden className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Close video"
                autoFocus
                className="flex size-11 items-center justify-center rounded-full bg-page text-ink transition-colors hover:bg-surface"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="aspect-[9/16] w-full max-w-[min(100%,calc((100dvh-9rem)*9/16))] overflow-hidden rounded-sm bg-black">
              <iframe
                key={open.id}
                src={open.embedUrl}
                title={open.title || open.description || "TikTok video"}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
