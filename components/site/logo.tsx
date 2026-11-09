import Image from "next/image";

import logo from "@/public/brand/logo-final.png";
import { SITE_NAME } from "@/lib/site";

// The logo file is white on transparent, so <Logo> must sit on
// .surface-burgundy. <InkLogo> paints the same shape in the brand colour
// (a CSS mask), for light pages.
export function Logo({
  className = "",
  sizes = "128px",
}: {
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={logo}
      alt={SITE_NAME}
      sizes={sizes}
      loading="eager"
      className={className}
    />
  );
}

export function InkLogo({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label={SITE_NAME}
      className={`aspect-[664/304] bg-brand ${className}`}
      style={{
        maskImage: `url(${logo.src})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}
