import { SEED_SITE_CONTENT } from "@/lib/seed-data";
import type { SiteContent } from "@/types/cms";
import { SECTION_SCHEMAS, type SiteSection } from "./schemas";

// A saved section replaces its placeholder as a whole. A section that is
// missing or no longer valid falls back to the placeholder, so one bad field
// can't take a page down.
export function withPlaceholders(saved: unknown): SiteContent {
  const data =
    typeof saved === "object" && saved !== null
      ? (saved as Record<string, unknown>)
      : {};
  const sections = Object.keys(SECTION_SCHEMAS) as SiteSection[];
  return Object.fromEntries(
    sections.map((section) => {
      const parsed = SECTION_SCHEMAS[section].safeParse(data[section]);
      if (!parsed.success && data[section] !== undefined) {
        console.error(`siteContent/main.${section} is invalid; using placeholder`);
      }
      return [
        section,
        parsed.success ? parsed.data : SEED_SITE_CONTENT[section],
      ];
    }),
  ) as SiteContent;
}
