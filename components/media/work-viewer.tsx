"use client";

import { useLenis } from "lenis/react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { CldImage, getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import type { PortfolioMedia } from "@/types/portfolio";
import { WorkThumb } from "./work-media";

// The media grid on a look's page. Tapping an item opens a full-screen viewer
// (native <dialog>: focus stays inside, Escape closes, focus returns to the
// tapped item) with swipe, arrow keys and prev/next buttons.

// A swipe further than this (px) moves to the next item.
const SWIPE_THRESHOLD = 50;

const navButton =
  "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-sm border border-line bg-page text-ink transition-colors hover:border-brand hover:bg-brand hover:text-on-brand disabled:invisible sm:flex";

export function WorkViewer({
  media,
  title,
  className = "mx-auto grid max-w-6xl gap-4 md:grid-cols-2",
  sizes = {
    wide: "(max-width: 768px) 100vw, 1152px",
    half: "(max-width: 768px) 100vw, 50vw",
  },
}: {
  media: PortfolioMedia[];
  title: string;
  // The grid: an odd count makes the first item span the full row.
  className?: string;
  sizes?: { wide: string; half: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const lenis = useLenis();
  const lone = media.length % 2 === 1;

  const isOpen = index !== null;

  // Safari doesn't focus a tapped button, so the dialog can't be relied on to
  // return focus by itself.
  const trigger = useRef<HTMLElement | null>(null);

  function open(i: number, from: HTMLElement) {
    trigger.current = from;
    setIndex(i);
    dialog.current?.showModal();
  }

  // Lock the page behind the viewer while it's open.
  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
    };
  }, [isOpen, lenis]);

  return (
    <>
      <div className={className}>
        {media.map((m, i) => {
          const wide = lone && i === 0;
          return (
            <Reveal key={m.publicId} className={wide ? "col-span-full" : ""}>
              <button
                type="button"
                onClick={(e) => open(i, e.currentTarget)}
                aria-label={`View ${m.type === "video" ? "video" : "photo"} ${i + 1} of ${media.length} full screen`}
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-sm bg-surface"
              >
                <WorkThumb
                  media={m}
                  sizes={wide ? sizes.wide : sizes.half}
                  priority={i === 0}
                  className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                />
                {m.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-page text-ink">
                      <Play aria-hidden className="size-7 translate-x-0.5" />
                    </span>
                  </span>
                )}
              </button>
            </Reveal>
          );
        })}
      </div>

      <dialog
        ref={dialog}
        // Runs for the close button and Escape alike.
        onClose={() => {
          setIndex(null);
          trigger.current?.focus();
        }}
        aria-label={`${title}: photos and videos`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-page p-0 text-ink backdrop:bg-page"
      >
        {index !== null && (
          <Slides
            media={media}
            index={index}
            onIndex={setIndex}
            onClose={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}

function Slides({
  media,
  index,
  onIndex,
  onClose,
}: {
  media: PortfolioMedia[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  // Set by a swipe so the click that ends it doesn't count as a tap.
  const swiped = useRef(false);
  // The latest offset, read on release (state may not have re-rendered yet).
  const offset = useRef(0);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const last = media.length - 1;

  const go = (i: number) => onIndex(Math.max(0, Math.min(last, i)));

  // Pause a video when moving away from it.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (v && i !== index) v.pause();
    });
  }, [index]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  }

  function onPointerDown(e: React.PointerEvent) {
    // Leave video controls usable.
    if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("video"))
      return;
    start.current = e.clientX;
    swiped.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 8) swiped.current = true;
    // Resist past the first and last item.
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === last);
    offset.current = atEdge ? dx / 3 : dx;
    setDrag(offset.current);
  }

  function onPointerEnd() {
    if (start.current === null) return;
    start.current = null;
    if (offset.current <= -SWIPE_THRESHOLD) go(index + 1);
    else if (offset.current >= SWIPE_THRESHOLD) go(index - 1);
    offset.current = 0;
    setDrag(0);
  }

  return (
    <div className="relative flex h-full flex-col" onKeyDown={onKeyDown}>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-muted" aria-live="polite">
          {index + 1} / {media.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          // First focusable element, so it gets focus when the dialog opens.
          autoFocus
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface"
        >
          <X aria-hidden className="size-6" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-pan-y overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div
          className={`flex h-full ${drag === 0 ? "transition-transform duration-300 ease-out motion-reduce:transition-none" : ""}`}
          style={{
            transform: `translateX(calc(${-index * 100}% + ${drag}px))`,
          }}
        >
          {media.map((m, i) => (
            <div
              key={m.publicId}
              className="flex h-full w-full shrink-0 items-center justify-center px-2 pb-4 sm:px-20"
              aria-hidden={i !== index}
              inert={i !== index}
              onClick={(e) => {
                // A tap on the dark space around the media closes.
                if (e.target === e.currentTarget && !swiped.current) onClose();
              }}
            >
              {/* Only the current item and its neighbours are loaded. */}
              {Math.abs(i - index) <= 1 && (
                <Slide
                  media={m}
                  videoRef={(el) => {
                    videos.current[i] = el;
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Previous"
          className={`${navButton} left-4`}
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === last}
          aria-label="Next"
          className={`${navButton} right-4`}
        >
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>

      {media[index].alt && (
        <p className="px-4 pb-4 text-center text-sm text-muted">
          {media[index].alt}
        </p>
      )}
    </div>
  );
}

function Slide({
  media,
  videoRef,
}: {
  media: PortfolioMedia;
  videoRef: (el: HTMLVideoElement | null) => void;
}) {
  const fit = "max-h-full max-w-full object-contain";
  if (media.type === "video") {
    const width = Math.min(media.width, 1920);
    return (
      <video
        ref={videoRef}
        className={fit}
        src={getCldVideoUrl({ src: media.publicId, width })}
        poster={getCldImageUrl({
          src: media.publicId,
          assetType: "video",
          format: "jpg",
          width,
        })}
        width={media.width}
        height={media.height}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={media.alt || undefined}
      />
    );
  }
  return (
    <CldImage
      src={media.publicId}
      width={media.width}
      height={media.height}
      sizes="100vw"
      alt={media.alt}
      draggable={false}
      className="h-full w-full object-contain"
    />
  );
}
