"use client";

import { useRef, useState } from "react";

import type { FieldErrors } from "@/lib/booking/admin-forms";
import type { Highlight, SiteContent, Testimonial } from "@/types/cms";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../_components/admin-form";
import { outlineButton, textLink } from "../_components/admin-ui";
import type { FormState } from "../_components/form-state";
import {
  saveAboutAction,
  saveContactAction,
  saveHeroAction,
  savePoliciesAction,
  savePrivacyAction,
  saveSeoAction,
  saveShopAction,
  saveTermsAction,
  saveTestimonialsAction,
} from "./actions";
import { HeroPortraitField } from "./hero-portrait-field";

const textareaClass = `${inputClass} py-2`;

const smallButton = outlineButton;

// One repeated entry (a highlight or a review), marked by a rule on the left.
const rowGroup = "flex flex-col gap-3 border-l-2 border-line pl-4";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

function SectionForm({
  action,
  children,
}: {
  action: Action;
  children: (errors: FieldErrors) => React.ReactNode;
}) {
  const { state, pending, onSubmit } = useAdminForm(action);
  const errors = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {children(errors)}
      {errors.form?.[0] && (
        <p className="text-sm font-semibold text-brand">{errors.form[0]}</p>
      )}
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save</SubmitButton>
    </form>
  );
}

// Rows keep a stable key so React doesn't mix up uncontrolled inputs when one
// is removed. Their position in the form is what the server reports errors by.
function useRows<T>(initial: T[], blank: T) {
  const next = useRef(initial.length);
  const [rows, setRows] = useState(() =>
    initial.map((value, key) => ({ key, value })),
  );
  return {
    rows,
    add: () => setRows((r) => [...r, { key: next.current++, value: blank }]),
    remove: (key: number) => setRows((r) => r.filter((row) => row.key !== key)),
  };
}

export function HeroForm({ hero }: { hero: SiteContent["hero"] }) {
  return (
    <SectionForm action={saveHeroAction}>
      {(errors) => (
        <>
          <Field
            label="Small line above the headline (optional)"
            hint="e.g. Locs · Retwists · Styling"
            error={errors.eyebrow}
          >
            <input
              name="eyebrow"
              defaultValue={hero.eyebrow}
              className={inputClass}
            />
          </Field>
          <Field label="Headline" error={errors.title}>
            <input
              name="title"
              defaultValue={hero.title}
              className={inputClass}
            />
          </Field>
          <Field label="Text under the headline" error={errors.subtitle}>
            <textarea
              name="subtitle"
              rows={3}
              defaultValue={hero.subtitle}
              className={textareaClass}
            />
          </Field>
          <HeroPortraitField initial={hero.portrait} error={errors.portrait} />
        </>
      )}
    </SectionForm>
  );
}

const BLANK_HIGHLIGHT: Highlight = { title: "", body: "" };

export function AboutForm({ about }: { about: SiteContent["about"] }) {
  const highlights = useRows(about.highlights, BLANK_HIGHLIGHT);
  return (
    <SectionForm action={saveAboutAction}>
      {(errors) => (
        <>
          <Field label="Heading" error={errors.heading}>
            <input
              name="heading"
              defaultValue={about.heading}
              className={inputClass}
            />
          </Field>
          <Field
            label="Your story"
            hint="Leave an empty line between paragraphs. The first paragraph also shows on the home page."
            error={errors.paragraphs}
          >
            <textarea
              name="paragraphs"
              rows={8}
              defaultValue={about.paragraphs.join("\n\n")}
              className={textareaClass}
            />
          </Field>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm text-muted">
              Highlights (up to 6)
            </legend>
            {highlights.rows.map(({ key, value }, i) => (
              <div key={key} className={rowGroup}>
                <Field label="Title" error={errors[`title.${i}`]}>
                  <input
                    name="highlightTitle"
                    defaultValue={value.title}
                    className={inputClass}
                  />
                </Field>
                <Field label="Text" error={errors[`body.${i}`]}>
                  <textarea
                    name="highlightBody"
                    rows={2}
                    defaultValue={value.body}
                    className={textareaClass}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => highlights.remove(key)}
                  className={smallButton}
                >
                  Remove highlight
                </button>
              </div>
            ))}
            {errors.highlights?.[0] && (
              <p className="text-sm font-semibold text-brand">{errors.highlights[0]}</p>
            )}
            {highlights.rows.length < 6 && (
              <button
                type="button"
                onClick={highlights.add}
                className={smallButton}
              >
                + Add a highlight
              </button>
            )}
          </fieldset>
        </>
      )}
    </SectionForm>
  );
}

const BLANK_TESTIMONIAL: Testimonial = { quote: "", name: "", detail: "" };

export function TestimonialsForm({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const reviews = useRows(testimonials, BLANK_TESTIMONIAL);
  return (
    <SectionForm action={saveTestimonialsAction}>
      {(errors) => (
        <>
          {reviews.rows.length === 0 && (
            <p className="text-sm text-muted">
              No reviews. The reviews section is hidden on the website.
            </p>
          )}
          {reviews.rows.map(({ key, value }, i) => (
            <div key={key} className={rowGroup}>
              <Field label="Review" error={errors[`quote.${i}`]}>
                <textarea
                  name="quote"
                  rows={3}
                  defaultValue={value.quote}
                  className={textareaClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Name"
                  hint="First name, initials, or “Client review”"
                  error={errors[`name.${i}`]}
                >
                  <input
                    name="name"
                    defaultValue={value.name}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Service (optional)"
                  hint="e.g. Starter locs"
                  error={errors[`detail.${i}`]}
                >
                  <input
                    name="detail"
                    defaultValue={value.detail}
                    className={inputClass}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => reviews.remove(key)}
                className={smallButton}
              >
                Remove review
              </button>
            </div>
          ))}
          {reviews.rows.length < 12 && (
            <button
              type="button"
              onClick={reviews.add}
              className={smallButton}
            >
              + Add a review
            </button>
          )}
          <p className="text-xs text-muted">
            Only post reviews clients have agreed to share.
          </p>
        </>
      )}
    </SectionForm>
  );
}

export function ContactForm({ contact }: { contact: SiteContent["contact"] }) {
  return (
    <SectionForm action={saveContactAction}>
      {(errors) => (
        <>
          <Field
            label="Area"
            hint="Shown when there's no full address, e.g. South London"
            error={errors.area}
          >
            <input
              name="area"
              defaultValue={contact.area}
              className={inputClass}
            />
          </Field>
          <Field
            label="Address (optional)"
            hint="One line per row. Leave empty to share it only after booking."
            error={errors.addressLines}
          >
            <textarea
              name="addressLines"
              rows={3}
              defaultValue={contact.addressLines.join("\n")}
              autoComplete="street-address"
              className={textareaClass}
            />
          </Field>
          <Field
            label="Map link (optional)"
            hint="Paste a Google Maps or Apple Maps share link"
            error={errors.mapUrl}
          >
            <input
              name="mapUrl"
              type="url"
              inputMode="url"
              defaultValue={contact.mapUrl}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone (optional)" error={errors.phone}>
              <input
                name="phone"
                type="tel"
                defaultValue={contact.phone}
                className={inputClass}
              />
            </Field>
            <Field
              label="WhatsApp number (optional)"
              error={errors.whatsapp}
            >
              <input
                name="whatsapp"
                type="tel"
                defaultValue={contact.whatsapp && `+${contact.whatsapp}`}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Email (optional)" error={errors.email}>
            <input
              name="email"
              type="email"
              autoCapitalize="none"
              defaultValue={contact.email}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Instagram (optional)"
              hint="Username or profile link"
              error={errors.instagram}
            >
              <input
                name="instagram"
                autoCapitalize="none"
                defaultValue={contact.instagram}
                className={inputClass}
              />
            </Field>
            <Field
              label="TikTok (optional)"
              hint="Username or profile link"
              error={errors.tiktok}
            >
              <input
                name="tiktok"
                autoCapitalize="none"
                defaultValue={contact.tiktok}
                className={inputClass}
              />
            </Field>
          </div>
        </>
      )}
    </SectionForm>
  );
}

export function PoliciesForm({
  policies,
}: {
  policies: SiteContent["policies"];
}) {
  return (
    <SectionForm action={savePoliciesAction}>
      {(errors) => (
        <Field
          label="What clients should know"
          hint="One point per line. Leave empty to hide the section."
          error={errors.booking}
        >
          <textarea
            name="booking"
            rows={6}
            defaultValue={policies.booking.join("\n")}
            className={textareaClass}
          />
        </Field>
      )}
    </SectionForm>
  );
}

export function ShopForm({ shop }: { shop: SiteContent["shop"] }) {
  return (
    <SectionForm action={saveShopAction}>
      {(errors) => (
        <>
          <Field label="Heading" error={errors.heading}>
            <input
              name="heading"
              defaultValue={shop.heading}
              className={inputClass}
            />
          </Field>
          <Field
            label="Introduction (optional)"
            error={errors.intro}
          >
            <textarea
              name="intro"
              rows={3}
              defaultValue={shop.intro}
              className={textareaClass}
            />
          </Field>
          <Field
            label="Ordering, collection and delivery"
            hint="One point per line, e.g. how payment, collection and delivery work"
            error={errors.notes}
          >
            <textarea
              name="notes"
              rows={4}
              defaultValue={shop.notes.join("\n")}
              className={textareaClass}
            />
          </Field>
        </>
      )}
    </SectionForm>
  );
}

export function SeoForm({ seo }: { seo: SiteContent["seo"] }) {
  return (
    <SectionForm action={saveSeoAction}>
      {(errors) => (
        <Field
          label="Description"
          hint="One or two sentences; around 150 characters works best"
          error={errors.description}
        >
          <textarea
            name="description"
            rows={3}
            defaultValue={seo.description}
            className={textareaClass}
          />
        </Field>
      )}
    </SectionForm>
  );
}

// How the legal text box is written; mirrors lib/content/legal-text.ts.
function LegalFormatHelp({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-sm bg-surface p-4 text-sm text-muted">
      <p className="font-semibold text-ink">How to format the text</p>
      <ul className="flex flex-col gap-1 pl-5">
        <li className="list-disc">
          Start a line with <code className="text-ink">## </code> for a heading
        </li>
        <li className="list-disc">
          Start a line with <code className="text-ink">- </code> for a bullet
          point
        </li>
        <li className="list-disc">Leave a blank line between paragraphs</li>
        <li className="list-disc">Web and email addresses become links</li>
      </ul>
      <p>
        Saving sets &ldquo;Last updated&rdquo; to today.{" "}
        <a href={href} target="_blank" className={textLink}>
          View the page ↗
        </a>
      </p>
    </div>
  );
}

const legalTextareaClass = `${textareaClass} min-h-96 font-mono text-sm leading-relaxed`;

export function PrivacyForm({
  privacy,
}: {
  privacy: SiteContent["privacy"];
}) {
  return (
    <SectionForm action={savePrivacyAction}>
      {(errors) => (
        <>
          <Field
            label="Your full legal name"
            hint="As a sole trader you are the “data controller”. Shown in “Who we are” on the Privacy and Terms pages."
            error={errors.controllerName}
          >
            <input
              name="controllerName"
              defaultValue={privacy.controllerName}
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field
            label="Email for privacy requests"
            hint="Also shown as the contact email on the Terms page"
            error={errors.contactEmail}
          >
            <input
              name="contactEmail"
              type="email"
              defaultValue={privacy.contactEmail}
              className={inputClass}
            />
          </Field>
          <LegalFormatHelp href="/privacy" />
          <Field label="Privacy notice" error={errors.body}>
            <textarea
              name="body"
              rows={28}
              defaultValue={privacy.body}
              className={legalTextareaClass}
            />
          </Field>
        </>
      )}
    </SectionForm>
  );
}

export function TermsForm({ terms }: { terms: SiteContent["terms"] }) {
  return (
    <SectionForm action={saveTermsAction}>
      {(errors) => (
        <>
          <LegalFormatHelp href="/terms" />
          <Field
            label="Terms & returns"
            hint="Clients tick a box agreeing to these before they book or order. Each booking and order records the date of the version they agreed to."
            error={errors.body}
          >
            <textarea
              name="body"
              rows={28}
              defaultValue={terms.body}
              className={legalTextareaClass}
            />
          </Field>
        </>
      )}
    </SectionForm>
  );
}
