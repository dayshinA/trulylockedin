"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { CldImage } from "@/components/media/cld";
import { Highlight } from "@/components/site/highlight";
import { gsap, useGSAP } from "@/lib/gsap";
import placeholder from "@/public/hero/portrait.webp";
import type { ContentImage } from "@/types/cms";

// One geometry for masthead, portrait and disc, set as CSS variables on the
// section so they keep their proportions at every screen size:
//   --f  masthead font size        --mast  masthead top
//   --t  portrait top (top of the hair), part-way down the masthead letters
//   --p  portrait height
// The disc is centred on the face and sized from --p. The ratios suit a
// head-and-shoulders cut-out with the hair touching the top edge, like
// public/hero/portrait.webp. On tall screens the masthead is width-bound, so
// --mast centres masthead + portrait (whose shoulders fade out at 0.92 of its
// height) in the space above the headline instead of leaving a gap below.
// --o is how far down the masthead (in font sizes) the hair starts: less on
// phones, where the head is large next to the width-bound letters.
const heroGeometry =
  "[--f:min(12.4vw,26svh)] [--o:0.72] [--t:calc(var(--mast)_+_var(--o)*var(--f))] " +
  "[--p:min(56svh,112vw)] [--mast:max(76px,calc((100svh_-_130px_-_var(--o)*var(--f)_-_0.92*var(--p))/2))] " +
  "md:[--o:0.55] md:[--p:min(calc(100svh_-_max(8svh,72px)_-_var(--o)*var(--f)),105vw)] " +
  "md:[--mast:max(8svh,72px,calc((100svh_-_40px_-_var(--o)*var(--f)_-_0.92*var(--p))/2))]";

const FACE_Y = 0.43; // disc centre, as a fraction of the portrait height
const DISC_RADIUS = 0.4; // fraction of the portrait height

const discClip = (radius: number) =>
  `circle(calc(var(--p) * ${radius}) at 50% calc(var(--t) + var(--p) * ${FACE_Y}))`;

// Softens the lower body and the sides, where a portrait is usually cropped.
const fadeEdges: React.CSSProperties = {
  maskImage:
    "linear-gradient(to right, transparent 2%, black 14%, black 86%, transparent 98%), linear-gradient(to bottom, black 72%, transparent 92%)",
  maskRepeat: "no-repeat",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
  // Browsers leave a hairline where the mask meets the image's edge.
  clipPath: "inset(0 3px)",
};

const portraitClass =
  "hero-portrait h-full w-auto max-w-none origin-bottom";

// Placed from the top so the hair always overlaps the masthead by the same
// share of its letters; on phones the shoulders fade out above the headline.
const portraitFrame =
  "absolute top-(--t) left-1/2 z-10 h-(--p) -translate-x-1/2";

function Masthead() {
  return (
    <p
      aria-hidden
      className="absolute inset-x-0 top-(--mast) text-center font-masthead text-(length:--f) leading-none font-bold tracking-[-0.04em] whitespace-nowrap"
    >
      Truly Locked In
    </p>
  );
}

function BookLink({
  className = "",
  accent = false,
}: {
  className?: string;
  accent?: boolean;
}) {
  const colours = accent
    ? "bg-accent text-on-accent hover:bg-accent-hover"
    : "bg-brand text-on-brand hover:bg-brand-hover";
  return (
    <Link
      href="/book"
      className={`min-h-12 items-center gap-3 rounded-full px-7 text-sm font-semibold transition-colors ${colours} ${className}`}
    >
      Book your appointment <span aria-hidden>→</span>
    </Link>
  );
}

export function HomeHero({
  eyebrow,
  title,
  subtitle,
  portrait,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  portrait?: ContentImage;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const panel = root.current!.querySelector<HTMLElement>(".hero-panel")!;
        const disc = { radius: DISC_RADIUS };
        const paint = () => {
          panel.style.clipPath = discClip(disc.radius);
        };

        gsap.from(".hero-portrait", { y: 60, duration: 1.3, ease: "power3.out" });
        gsap.from(disc, {
          radius: 0.24,
          duration: 1.3,
          ease: "expo.out",
          onUpdate: paint,
        });
        gsap.set(".hero-after", { autoAlpha: 0 });

        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "+=140%",
              pin: true,
              anticipatePin: 1,
              scrub: 0.6,
            },
          })
          .fromTo(
            disc,
            { radius: DISC_RADIUS },
            {
              // Several portrait heights: enough to cover any screen.
              radius: 5,
              ease: "power2.in",
              onUpdate: paint,
              immediateRender: false,
              duration: 0.6,
            },
            0,
          )
          .to(".hero-portrait", { scale: 0.9, y: 30, ease: "none", duration: 0.6 }, 0)
          .to(".hero-before", { autoAlpha: 0, duration: 0.2 }, 0)
          .fromTo(
            ".hero-after",
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.3 },
            0.7,
          );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    // ScrollTrigger wraps the pinned section in its own element. This wrapper
    // gives React a stable node to remove when navigating away.
    <div>
      <section
        ref={root}
        className={`relative z-10 h-svh min-h-[34rem] overflow-hidden bg-page ${heroGeometry}`}
      >
        <div className="absolute inset-0 text-brand">
          <Masthead />
        </div>
        <div
          className="hero-panel surface-burgundy absolute inset-0"
          style={{ clipPath: discClip(DISC_RADIUS) }}
        >
          <Masthead />
        </div>

        {portrait ? (
          // Uploaded cut-outs are expected to have the head centred.
          <div className={portraitFrame}>
            <CldImage
              src={portrait.publicId}
              width={portrait.width}
              height={portrait.height}
              alt={portrait.alt}
              sizes="(min-width: 768px) 60vw, 100vw"
              preload
              className={portraitClass}
              style={fadeEdges}
            />
          </div>
        ) : (
          // The default portrait, used until one is uploaded.
          <div className={portraitFrame}>
            <Image
              src={placeholder}
              alt=""
              sizes="(min-width: 768px) 60vw, 100vw"
              preload
              className={portraitClass}
              style={fadeEdges}
            />
          </div>
        )}

        <div className="hero-before absolute bottom-24 left-4 z-20 max-w-[78vw] md:bottom-12 md:left-[3vw] md:max-w-[30vw]">
          <h1 className="font-masthead text-3xl leading-tight text-ink italic md:text-[clamp(1.875rem,3.2vw,3.25rem)]">
            <Highlight text={title} />
          </h1>
          {eyebrow && (
            <p className="mt-3 flex items-center gap-3 text-xs tracking-[0.3em] text-accent-ink uppercase">
              <span aria-hidden className="h-0.5 w-8 shrink-0 bg-accent" />
              {eyebrow}
            </p>
          )}
          {/* The scroll-revealed text below never plays with reduced motion. */}
          {subtitle && (
            <p className="mt-3 hidden text-muted motion-reduce:block">
              {subtitle}
            </p>
          )}
        </div>
        <BookLink className="hero-before absolute right-[3vw] bottom-12 z-20 hidden md:inline-flex" />

        {/* Keeps the text readable where it crosses the portrait on phones. */}
        <div
          aria-hidden
          className="hero-after surface-burgundy invisible absolute inset-x-0 bottom-0 z-[15] h-3/5 bg-transparent! bg-linear-to-t from-page from-30% to-transparent motion-reduce:hidden md:hidden"
        />
        <div className="hero-after surface-burgundy invisible absolute bottom-24 left-4 z-20 max-w-[78vw] bg-transparent! motion-reduce:hidden md:top-1/2 md:bottom-auto md:left-[4vw] md:max-w-[30vw] md:-translate-y-1/2">
          {subtitle && (
            <p className="font-masthead text-2xl leading-snug md:text-[clamp(1.5rem,2.4vw,2.5rem)]">
              {subtitle}
            </p>
          )}
          <BookLink accent className="mt-6 inline-flex" />
        </div>
      </section>
    </div>
  );
}
