import "server-only";

import { bookingRepository } from "@/lib/booking/server";
import { readSiteContent } from "@/lib/content/store";
import { adminDb } from "@/lib/firebase/admin";
import { portfolioRepository } from "@/lib/portfolio/server";
import { productRepository } from "@/lib/shop/server";

// Every public_id a saved look, service, product or site photo uses. Checked before deleting any
// file, so a shared or re-used upload is never removed while still shown.
export async function referencedPublicIds(): Promise<Set<string>> {
  const [items, services, products, { content }] = await Promise.all([
    portfolioRepository().list(),
    bookingRepository().listServices(),
    productRepository().list(),
    readSiteContent(adminDb()),
  ]);
  return new Set([
    ...items.flatMap((item) => item.media.map((m) => m.publicId)),
    ...services.flatMap((s) => (s.imagePublicId ? [s.imagePublicId] : [])),
    ...products.flatMap((p) => p.media.map((m) => m.publicId)),
    ...(content.hero.portrait ? [content.hero.portrait.publicId] : []),
    ...(content.home.servicesImage
      ? [content.home.servicesImage.publicId]
      : []),
  ]);
}
