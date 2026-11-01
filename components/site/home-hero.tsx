"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { CldImage } from "@/components/media/cld";
import { gsap, useGSAP } from "@/lib/gsap";
import placeholder from "@/public/hero/portrait-placeholder.webp";
import type { ContentImage } from "@/types/cms";

const DISC_RADIUS = 17; // vmax
const DISC_CENTRE = "50% 47%";

const discClip = (radius: number) =>
  `circle(${radius}vmax at ${DISC_CENTRE})`;

// Softens the lower body and the sides, where a portrait is usually cropped.
const fadeEdges: React.CSSProperties = {
  maskImage:
    "linear-gradient(to right, transparent 1%, black 10%, black 84%, transparent 98%), linear-gradient(to bottom, black 58%, transparent 96%)",
  maskRepeat: "no-repeat",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
  // Browsers leave a hairline where the mask meets the image's edge.
  clipPath: "inset(0 3px)",
};

const portraitClass =
  "hero-portrait h-full w-auto max-w-none origin-bottom";

function Masthead() {
  return (
    <p
      aria-hidden
      className="absolute inset-x-0 top-[12%] text-center font-masthead text-[min(14.6vw,30svh)] leading-none tracking-[-0.04em] whitespace-nowrap md:top-[9%]"
    >
      Truly Locked In
    </p>
  );
}

function BookLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/book"
      className={`min-h-12 items-center gap-3 rounded-full bg-brand px-7 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover ${className}`}
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
          radius: 11,
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
              radius: 120,
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
        className="relative z-10 h-svh min-h-[34rem] overflow-hidden bg-page"
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
          <div className="absolute bottom-0 left-1/2 z-10 h-[72svh] -translate-x-1/2 md:h-[88svh]">
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
          // The placeholder's head sits left of the picture's centre.
          <div className="absolute bottom-0 left-1/2 z-10 h-[72svh] -translate-x-[40%] md:h-[88svh]">
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
            {title}
          </h1>
          {eyebrow && (
            <p className="mt-3 text-xs tracking-[0.3em] text-muted uppercase">
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
          <BookLink className="mt-6 inline-flex" />
        </div>
      </section>
    </div>
  );
}
