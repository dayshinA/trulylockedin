import type {
  CatalogueCategory,
  Service,
  ServiceCategory,
} from "@/types/booking";

const byOrder = <T extends { order: number; name: string }>(a: T, b: T) =>
  a.order - b.order || a.name.localeCompare(b.name);

// Nests active services under the categories shown online, both in display order.
export function buildCatalogue(
  categories: readonly ServiceCategory[],
  services: readonly Service[],
): CatalogueCategory[] {
  return categories
    .filter((category) => category.visibleOnline)
    .toSorted(byOrder)
    .map((category) => ({
      ...category,
      services: services
        .filter((s) => s.categoryId === category.id && s.active)
        .toSorted(byOrder),
    }))
    .filter((category) => category.services.length > 0);
}

export function isOnlineService(
  service: Pick<Service, "active" | "onlineBooking">,
  category: Pick<ServiceCategory, "visibleOnline">,
): boolean {
  return service.active && service.onlineBooking && category.visibleOnline;
}

// Online booking also needs a known duration, or no slots can be worked out.
export function isBookableOnline(
  service: Pick<Service, "active" | "onlineBooking" | "durationMin">,
  category: Pick<ServiceCategory, "visibleOnline">,
): boolean {
  return isOnlineService(service, category) && service.durationMin !== null;
}
