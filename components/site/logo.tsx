import Image from "next/image";

import logo from "@/public/brand/logo-white.png";
import { SITE_NAME } from "@/lib/site";

// The logo is white on transparent, so it must sit on .surface-burgundy.
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
