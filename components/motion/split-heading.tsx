"use client";

import { useRef } from "react";

import { Highlight } from "@/components/site/highlight";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

// Line-by-line headline reveal. *Starred* words are orange (see Highlight). Re-splits when fonts load or the width changes.
export function SplitHeading({
  as: Tag = "h2",
  className,
  children,
  delay = 0,
}: {
  as?: "h1" | "h2";
  className?: string;
  children: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(ref.current!, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: "power4.out",
              stagger: 0.09,
              delay,
              scrollTrigger: {
                trigger: ref.current!,
                start: "top 90%",
                once: true,
              },
            }),
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      <Highlight text={children} />
    </Tag>
  );
}
