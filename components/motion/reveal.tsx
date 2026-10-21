"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";

// Fades and lifts its children in when scrolled into view. The markup is
// visible by default; GSAP sets the hidden start state only when motion is OK.
export function Reveal({
  children,
  className,
  delay = 0,
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  // Animate direct children one after another instead of the block at once.
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = ref.current!;
        gsap.from(stagger ? el.children : el, {
          autoAlpha: 0,
          y: 28,
          duration: 0.9,
          ease: "power3.out",
          delay,
          stagger: stagger ? 0.1 : 0,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
