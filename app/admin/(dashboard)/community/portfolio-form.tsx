"use client";

import type { PortfolioItem } from "@/types/portfolio";
import {
  Checkbox,
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../_components/admin-form";
import { MediaManager } from "../_components/media-manager";
import { savePortfolioAction } from "./actions";

export function PortfolioForm({
  item,
  categories,
}: {
  item?: PortfolioItem;
  categories: string[];
}) {
  const { state, pending, onSubmit } = useAdminForm(savePortfolioAction);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}

      <Field
        label="Title"
        hint="The name of the look, e.g. Sisterlocks on shoulder-length hair"
        error={errors.title}
      >
        <input name="title" defaultValue={item?.title} className={inputClass} />
      </Field>
      {!item && (
        <Field
          label="Web address"
          hint="The end of this look's link on the website (…/community/your-text). Leave it empty and one is made from the title. It can't be changed later."
          error={errors.slug}
        >
          <input name="slug" autoCapitalize="none" className={inputClass} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field
          label="Style / category"
          hint="Visitors can filter the Community page by this. Pick an existing one from the list to keep them grouped."
          error={errors.category}
        >
          <input
            name="category"
            list="portfolio-categories"
            defaultValue={item?.category}
            className={inputClass}
          />
          <datalist id="portfolio-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Order" hint="0 shows first" error={errors.order}>
          <input
            name="order"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={item?.order ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Description (optional)"
        hint="Shown on the look's own page: the style, how long it took, products used…"
        error={errors.description}
      >
        <textarea
          name="description"
          rows={3}
          defaultValue={item?.description}
          className={`${inputClass} py-2`}
        />
      </Field>

      <MediaManager
        initial={item?.media}
        initialCover={item?.coverPublicId}
        state={state}
        error={errors.media}
        videos
        legend="Photos & videos"
      />

      <div className="flex flex-col">
        <Checkbox
          name="published"
          label="Show on the website"
          hint="Untick to hide it while you're still working on it. It needs at least one photo to be shown."
          defaultChecked={item?.published ?? true}
        />
        <Checkbox
          name="featured"
          label="Feature on the home page"
          hint="Shows it in “Recent looks” on the home page (up to 6 are shown). Pick your best work."
          defaultChecked={item?.featured}
        />
      </div>

      <FormMessage state={state} />
      <SubmitButton pending={pending}>
        {item ? "Save changes" : "Add look"}
      </SubmitButton>
    </form>
  );
}
