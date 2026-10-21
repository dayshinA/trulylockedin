import type { Firestore } from "firebase-admin/firestore";

import type { SiteContent } from "@/types/cms";
import { withPlaceholders } from "./merge";
import { SECTION_SCHEMAS, type SiteSection } from "./schemas";

// siteContent/main: one field per section. Takes a Firestore instance so the
// emulator tests can pass their own.

const doc = (db: Firestore) => db.doc("siteContent/main");

// `saved` lists the sections the owner has saved; the rest show placeholders.
export async function readSiteContent(
  db: Firestore,
): Promise<{ content: SiteContent; saved: SiteSection[] }> {
  const data = (await doc(db).get()).data() ?? {};
  const sections = Object.keys(SECTION_SCHEMAS) as SiteSection[];
  return {
    content: withPlaceholders(data),
    saved: sections.filter((section) => data[section] !== undefined),
  };
}

// mergeFields replaces the whole section, so cleared optional fields (e.g. a
// removed phone number) are deleted rather than merged into the old value.
export async function saveSiteSection<K extends SiteSection>(
  db: Firestore,
  section: K,
  value: SiteContent[K],
): Promise<void> {
  await doc(db).set(
    { [section]: value, updatedAt: new Date().toISOString() },
    { mergeFields: [section, "updatedAt"] },
  );
}
