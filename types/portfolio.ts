// portfolio/{id} — one "look" in the gallery. The id doubles as the URL slug
// (/work/{id}) and never changes after creation.

export type PortfolioMedia = {
  // Cloudinary public_id, always under PORTFOLIO_FOLDER.
  publicId: string;
  type: "image" | "video";
  width: number;
  height: number;
  alt: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  // Free text, used for the /work filter, e.g. "Starter locs".
  category: string;
  description: string;
  // Display order; the first image is the cover unless coverPublicId is set.
  media: PortfolioMedia[];
  coverPublicId?: string;
  featured: boolean;
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};
