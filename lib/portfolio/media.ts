import type { PortfolioItem, PortfolioMedia } from "@/types/portfolio";

// The image shown in grids: the chosen cover, else the first image, else the
// first video (rendered as its poster frame).
export function coverOf(
  item: Pick<PortfolioItem, "media" | "coverPublicId">,
): PortfolioMedia | undefined {
  return (
    item.media.find((m) => m.publicId === item.coverPublicId) ??
    item.media.find((m) => m.type === "image") ??
    item.media[0]
  );
}

// Media present before but not after a save; these get deleted from Cloudinary.
export function removedMedia(
  before: PortfolioMedia[],
  after: PortfolioMedia[],
): PortfolioMedia[] {
  const kept = new Set(after.map((m) => m.publicId));
  return before.filter((m) => !kept.has(m.publicId));
}

export function sortPortfolio(items: PortfolioItem[]): PortfolioItem[] {
  return items.sort(
    (a, b) => a.order - b.order || b.createdAt.localeCompare(a.createdAt),
  );
}
