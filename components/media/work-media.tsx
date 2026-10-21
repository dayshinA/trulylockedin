"use client";

import { CldImage } from "next-cloudinary";

import type { PortfolioMedia } from "@/types/portfolio";

// Grid thumbnail: videos show their poster frame as an image.
export function WorkThumb({
  media,
  sizes,
  priority = false,
  className = "",
}: {
  media: PortfolioMedia;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <CldImage
      className={className}
      src={media.publicId}
      assetType={media.type}
      width={media.width}
      height={media.height}
      sizes={sizes}
      alt={media.alt}
      priority={priority}
    />
  );
}
