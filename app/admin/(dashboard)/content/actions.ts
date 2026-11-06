"use server";

import { refresh, updateTag } from "next/cache";

import { verifyAdmin } from "@/lib/auth/dal";
import { destroyMedia } from "@/lib/cloudinary";
import type { Parsed } from "@/lib/booking/admin-forms";
import {
  parseAboutForm,
  parseContactForm,
  parseHeroForm,
  parsePoliciesForm,
  parsePrivacyForm,
  parseSeoForm,
  parseShopForm,
  parseTermsForm,
  parseTestimonialsForm,
} from "@/lib/content/forms";
import type { SiteSection } from "@/lib/content/schemas";
import { readSiteContent, saveSiteSection } from "@/lib/content/store";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { adminDb } from "@/lib/firebase/admin";
import { todayLocal } from "@/lib/booking/time";
import { referencedPublicIds } from "@/lib/media/references";
import { TIMEZONE } from "@/lib/site";
import type { SiteContent } from "@/types/cms";
import { invalid, type FormState } from "../_components/form-state";

// Each section saves on its own and replaces the stored section as a whole.

async function save<K extends SiteSection>(
  section: K,
  parsed: Parsed<SiteContent[K]>,
): Promise<FormState> {
  if (!parsed.ok) return invalid(parsed.fieldErrors, parsed.message);
  await saveSiteSection(adminDb(), section, parsed.value);
  updateTag(PUBLIC_TAGS.content);
  refresh();
  return { status: "success", message: "Saved. The website is updated." };
}

// A replaced or removed photo is deleted once the save has succeeded, unless
// something else still uses it.
export async function saveHeroAction(_previous: FormState, formData: FormData) {
  await verifyAdmin();
  const before = (await readSiteContent(adminDb())).content.hero.portrait;
  const result = await save("hero", parseHeroForm(formData));
  if (result.status === "success" && before) {
    const inUse = await referencedPublicIds();
    if (!inUse.has(before.publicId)) {
      await destroyMedia([{ publicId: before.publicId, type: "image" }]);
    }
  }
  return result;
}

export async function saveAboutAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("about", parseAboutForm(formData));
}

export async function saveTestimonialsAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("testimonials", parseTestimonialsForm(formData));
}

export async function saveContactAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("contact", parseContactForm(formData));
}

export async function savePoliciesAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("policies", parsePoliciesForm(formData));
}

export async function saveShopAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("shop", parseShopForm(formData));
}

export async function saveSeoAction(_previous: FormState, formData: FormData) {
  await verifyAdmin();
  return save("seo", parseSeoForm(formData));
}

const today = () => todayLocal(new Date(), TIMEZONE);

export async function savePrivacyAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("privacy", parsePrivacyForm(formData, today()));
}

// Bookings and orders made after this save record the new date as the terms
// version the client agreed to.
export async function saveTermsAction(
  _previous: FormState,
  formData: FormData,
) {
  await verifyAdmin();
  return save("terms", parseTermsForm(formData, today()));
}
