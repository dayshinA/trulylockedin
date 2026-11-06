"use client";

import { penceToPounds } from "@/lib/booking/admin-forms";
import type { Product } from "@/types/shop";
import {
  Checkbox,
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../_components/admin-form";
import { MediaManager } from "../_components/media-manager";
import { saveProductAction } from "./actions";

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: string[];
}) {
  const { state, pending, onSubmit } = useAdminForm(saveProductAction);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {product && <input type="hidden" name="id" value={product.id} />}

      <Field
        label="Name"
        hint="Include the size if you sell more than one, e.g. Scalp oil 100ml"
        error={errors.name}
      >
        <input
          name="name"
          defaultValue={product?.name}
          className={inputClass}
        />
      </Field>
      {!product && (
        <Field
          label="Web address"
          hint="The end of this product's link on the website (…/shop/your-text). Leave it empty and one is made from the name. It can't be changed later."
          error={errors.slug}
        >
          <input name="slug" autoCapitalize="none" className={inputClass} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Price (£)"
          hint="Changing it doesn't affect orders already placed"
          error={errors.price}
        >
          <input
            name="price"
            inputMode="decimal"
            defaultValue={
              product ? penceToPounds(product.pricePence) : undefined
            }
            className={inputClass}
          />
        </Field>
        <Field label="Order" hint="0 shows first" error={errors.order}>
          <input
            name="order"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={product?.order ?? 0}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Category (optional)"
        hint="Visitors can filter the Shop page by this, e.g. Oils. Pick an existing one from the list to keep them grouped."
        error={errors.category}
      >
        <input
          name="category"
          list="product-categories"
          defaultValue={product?.category}
          className={inputClass}
        />
        <datalist id="product-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field
        label="Description (optional)"
        hint="What it is, how to use it, size or ingredients"
        error={errors.description}
      >
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description}
          className={`${inputClass} py-2`}
        />
      </Field>

      <MediaManager
        initial={product?.media}
        initialCover={product?.coverPublicId}
        state={state}
        error={errors.media}
        videos={false}
        legend="Photos"
      />

      <div className="flex flex-col">
        <Checkbox
          name="inStock"
          label="In stock"
          hint="Untick when you run out: it stays on the website marked “Sold out” and can't be ordered. Tick it again when it's back."
          defaultChecked={product?.inStock ?? true}
        />
        <Checkbox
          name="published"
          label="Show on the website"
          hint="Untick to hide it from the shop completely. It needs at least one photo to be shown."
          defaultChecked={product?.published ?? true}
        />
        <Checkbox
          name="featured"
          label="Feature on the home page"
          hint="Shows it in “Care between visits” on the home page (up to 4 are shown)."
          defaultChecked={product?.featured}
        />
      </div>

      <FormMessage state={state} />
      <SubmitButton pending={pending}>
        {product ? "Save changes" : "Add product"}
      </SubmitButton>
    </form>
  );
}
