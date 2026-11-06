import type { MetadataRoute } from "next";

import { getPublishedProducts, getPublishedWork } from "@/lib/data/public";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/work", "/services", "/shop", "/about", "/contact", "/book", "/privacy", "/terms"];
  const [work, products] = await Promise.all([
    getPublishedWork(),
    getPublishedProducts(),
  ]);
  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...work.map((item) => ({
      url: `${SITE_URL}/work/${item.id}`,
      lastModified: item.updatedAt,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/shop/${product.id}`,
      lastModified: product.updatedAt,
    })),
  ];
}
