import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { bookingRepository } from "@/lib/booking/server";
import { readSiteContent } from "@/lib/content/store";
import { adminDb } from "@/lib/firebase/admin";
import { SEED_SERVICES, SEED_SITE_CONTENT } from "@/lib/seed-data";
import type { Service, WeeklyHours } from "@/types/booking";
import type { SiteContent } from "@/types/cms";
import type { PortfolioItem } from "@/types/portfolio";
import { portfolioRepository } from "@/lib/portfolio/server";
import { productRepository } from "@/lib/shop/server";
import type { Product } from "@/types/shop";

// Cached reads for the public pages. Admin saves expire these tags with
// updateTag (see PUBLIC_TAGS); live booking data never goes through here.

export const PUBLIC_TAGS = {
  content: "site-content",
  services: "services",
  hours: "opening-hours",
  portfolio: "portfolio",
  products: "products",
} as const;

// Sections the owner has saved replace the placeholder section as a whole
// (see lib/content/merge.ts).
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.content);
  try {
    return (await readSiteContent(adminDb())).content;
  } catch (error) {
    console.error("Falling back to placeholder site content", error);
    return SEED_SITE_CONTENT;
  }
}

export async function getPublicServices(): Promise<Service[]> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.services);
  try {
    return await bookingRepository().listServices({ activeOnly: true });
  } catch (error) {
    console.error("Falling back to placeholder services", error);
    return SEED_SERVICES.filter((service) => service.active);
  }
}

// No fallback: showing made-up opening hours would mislead clients.
export async function getOpeningHours(): Promise<WeeklyHours | null> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.hours);
  try {
    return await bookingRepository().getWeeklyHours();
  } catch {
    return null;
  }
}

// No placeholder looks: an empty gallery shows an empty state instead.
export async function getPublishedWork(): Promise<PortfolioItem[]> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.portfolio);
  try {
    return await portfolioRepository().list({ publishedOnly: true });
  } catch (error) {
    console.error("Portfolio unavailable", error);
    return [];
  }
}

export async function getWork(id: string): Promise<PortfolioItem | null> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.portfolio);
  try {
    const item = await portfolioRepository().get(id);
    return item?.published ? item : null;
  } catch {
    return null;
  }
}

// No placeholder products: an empty shop shows an empty state instead.
export async function getPublishedProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.products);
  try {
    return await productRepository().list({ publishedOnly: true });
  } catch (error) {
    console.error("Products unavailable", error);
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_TAGS.products);
  try {
    const product = await productRepository().get(id);
    return product?.published ? product : null;
  } catch {
    return null;
  }
}
