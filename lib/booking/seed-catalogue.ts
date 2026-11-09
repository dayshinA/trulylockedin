import type { Firestore } from "firebase-admin/firestore";

import type {
  OptionsSelectionMode,
  Service,
  ServiceCategory,
} from "@/types/booking";

// The salon's real services. Also loaded by scripts/seed-services.mts under plain
// Node, so this file may only have type imports. Array order is display order;
// prices here are whole pounds.

type SeedOption = { name: string; price: number; durationMinutes?: number };
type SeedService = {
  title: string;
  price: number;
  priceLabel?: string;
  durationMinutes: number | null;
  optionsSelectionMode: OptionsSelectionMode;
  optionsRequired: boolean;
  description?: string;
  // Defaults to true; the wash services don't take a deposit.
  depositRequired?: boolean;
  options: SeedOption[];
};

const RETWIST_DESCRIPTION =
  "Standard retwist comes with a wash treatment (loc repairs). Retwist and any styling of your choice.";
const COMPLIMENTARY_WASH = "All services come with a complimentary wash";

const plain = (
  title: string,
  price: number,
  durationMinutes: number | null,
  extra: Partial<SeedService> = {},
): SeedService => ({
  title,
  price,
  durationMinutes,
  optionsSelectionMode: "multiple",
  optionsRequired: false,
  options: [],
  ...extra,
});

const locCounts: SeedOption[] = [
  { name: "Under 100", price: 0 },
  { name: "Over 100 strands", price: 20 },
  { name: "Over 150", price: 35 },
];

const CATALOGUE: { name: string; services: SeedService[] }[] = [
  {
    name: "Locs",
    services: [
      plain("Retwist + style", 90, 105, {
        priceLabel: "Up to 100 locs",
        optionsSelectionMode: "single",
        optionsRequired: true,
        description: RETWIST_DESCRIPTION,
        options: locCounts,
      }),
      plain("Starter locs (coils)", 120, 180, {
        description:
          "A neat and defined starter loc technique using coiled sections of natural hair to begin the locking process.",
      }),
      plain("Kids under 16", 60, 120, {
        priceLabel: "Up to 100 locs",
        description: RETWIST_DESCRIPTION,
        options: [
          { name: "Under 100", price: 0 },
          { name: "Over 100", price: 15 },
        ],
      }),
      plain("Starter Locs (2 strand twist)", 140, 225),
      plain("Instant Locs", 350, 300),
      plain("Loc styling", 40, 60),
      plain("Loc repair", 5, 30, { priceLabel: "Per strand" }),
      plain("Locs Comb out", 350, 600, {
        priceLabel: "Price may change depending on length and amount of loss",
      }),
      plain("Loc Dye", 60, 90),
      plain("Locs Installs", 280, 240),
      plain("AVC Detox service", 80, 75),
    ],
  },
  {
    name: "Combo Deals",
    services: [
      plain("Detox + Retwist", 130, 180, { options: locCounts }),
      plain("Loc Dye + Retwist", 130, 210, { options: locCounts }),
    ],
  },
  {
    name: "Male Braids",
    services: [
      plain("Single plaits/Box braids", 70, 120, {
        options: [
          { name: "Take down previous style", price: 10 },
          { name: "Hair extensions", price: 10 },
        ],
      }),
      plain("All Cornrows", 60, 80, {
        priceLabel: COMPLIMENTARY_WASH,
        optionsRequired: true,
        options: [
          { name: "Take down old braid", price: 10, durationMinutes: 15 },
          { name: "Not needed", price: 0 },
          { name: "Hair extensions", price: 10 },
        ],
      }),
      plain("Twist", 70, 90, {
        priceLabel: COMPLIMENTARY_WASH,
        options: [{ name: "Take down previous style", price: 10 }],
      }),
    ],
  },
  {
    name: "Female Braids",
    services: [
      plain("Stitch braids", 40, 150, {
        optionsSelectionMode: "single",
        options: [
          { name: "2 braids", price: 40 },
          { name: "4 braids", price: 50 },
          { name: "6 braids", price: 60 },
          { name: "8 braids", price: 75 },
        ],
      }),
      plain("Knotless braids", 80, 90, {
        priceLabel: "80-150",
        options: [
          { name: "X-large", price: 80 },
          { name: "Large", price: 100 },
          { name: "Medium", price: 120 },
          { name: "Smedium", price: 135 },
          { name: "Small", price: 150 },
          { name: "Boho pieces add-on", price: 15 },
        ],
      }),
    ],
  },
  {
    name: "Ponytails",
    services: [
      plain("Weave Ponytails", 50, 90),
      plain("Braided ponytail", 60, 90),
    ],
  },
  {
    name: "Other Hair Services",
    services: [
      plain("Shea Butter Hair treatment", 40, 60),
      plain("Wash Blow Dry", 40, 30, { depositRequired: false }),
      plain("Wash Blowdry + Cut", 50, 60, { depositRequired: false }),
    ],
  },
];

// Stable ids, so a re-run recognises what it already wrote.
const toId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const SEED_CATEGORIES: ServiceCategory[] = CATALOGUE.map(
  ({ name }, order) => ({ id: toId(name), name, order, visibleOnline: true }),
);

export const SEED_SERVICES: Service[] = CATALOGUE.flatMap(
  ({ name: categoryName, services }) =>
    services.map((s, order) => ({
      id: toId(s.title),
      categoryId: toId(categoryName),
      name: s.title,
      slug: toId(s.title),
      description: s.description ?? "",
      priceFromPence: s.price * 100,
      ...(s.priceLabel ? { priceLabel: s.priceLabel } : {}),
      durationMin: s.durationMinutes,
      depositRequired: s.depositRequired ?? true,
      priceOnTheDay: false,
      active: true,
      onlineBooking: true,
      optionsSelectionMode: s.optionsSelectionMode,
      optionsRequired: s.optionsRequired,
      options: s.options.map((option) => ({
        id: toId(option.name),
        name: option.name,
        pricePence: option.price * 100,
        durationMin: option.durationMinutes ?? null,
      })),
      order,
    })),
);

// The placeholders from the first seed. They predate categories, so they have no
// categoryId and no longer parse as services.
const OLD_SAMPLE_IDS = new Set([
  "consultation",
  "starter-locs",
  "retwist-style",
  "interlocking",
  "loc-extensions",
  "loc-repair",
]);

export type CatalogueSeedResult = {
  categories: string[];
  services: string[];
  removed: string[];
};

// One transaction: adds what's missing, never touches a category or service that
// already exists, and swaps out the old samples. A service the owner deleted
// comes back if this is re-run. Anything else without a categoryId stops the run
// rather than being deleted.
export function seedCatalogue(
  db: Firestore,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<CatalogueSeedResult> {
  const categoriesCol = db.collection("serviceCategories");
  const servicesCol = db.collection("services");

  return db.runTransaction(async (tx) => {
    const categoriesSnap = await tx.get(categoriesCol);
    const servicesSnap = await tx.get(servicesCol);

    const legacy = servicesSnap.docs.filter((doc) => !doc.get("categoryId"));
    const unknown = legacy.filter((doc) => !OLD_SAMPLE_IDS.has(doc.id));
    if (unknown.length > 0) {
      throw new Error(
        `Services with no category that aren't old samples: ${unknown
          .map((doc) => doc.id)
          .join(", ")}. Nothing was changed.`,
      );
    }

    const existingCategories = new Set(categoriesSnap.docs.map((d) => d.id));
    const legacyIds = new Set(legacy.map((doc) => doc.id));
    const existingServices = new Set(
      servicesSnap.docs.map((d) => d.id).filter((id) => !legacyIds.has(id)),
    );

    const newCategories = SEED_CATEGORIES.filter(
      (c) => !existingCategories.has(c.id),
    );
    const newServices = SEED_SERVICES.filter(
      (s) => !existingServices.has(s.id),
    );

    if (!dryRun) {
      for (const doc of legacy) tx.delete(doc.ref);
      for (const { id, ...category } of newCategories) {
        tx.set(categoriesCol.doc(id), category);
      }
      // set, not create: "retwist-style" and "loc-repair" reuse sample ids.
      for (const { id, ...service } of newServices) {
        tx.set(servicesCol.doc(id), service);
      }
    }

    return {
      categories: newCategories.map((c) => c.id),
      services: newServices.map((s) => s.id),
      removed: legacy.map((doc) => doc.id),
    };
  });
}
