"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";
import { REDUCED_MOTION, useMediaQuery } from "@/lib/use-media-query";

// One Lenis instance for the public site, driven by GSAP's ticker so
// ScrollTrigger and smooth scroll stay in sync. Off for reduced motion.
export function SmoothScroll() {
  const reduceMotion = useMediaQuery(REDUCED_MOTION);
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const lenis = lenisRef.current?.lenis;
    const unsubscribe = lenis?.on("scroll", ScrollTrigger.update);
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      unsubscribe?.();
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;
  return <ReactLenis root options={{ autoRaf: false }} ref={lenisRef} />;
}
