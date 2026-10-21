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

      <Field label="Name" error={errors.name}>
        <input
          name="name"
          defaultValue={product?.name}
          className={inputClass}
        />
      </Field>
      {!product && (
        <Field
          label="Web address"
          hint="Leave empty to make one from the name. It can't be changed later."
          error={errors.slug}
        >
          <input name="slug" autoCapitalize="none" className={inputClass} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (£)" error={errors.price}>
          <input
            name="price"
            inputMode="decimal"
            defaultValue={
              product ? penceToPounds(product.pricePence) : undefined
            }
            className={inputClass}
          />
        </Field>
        <Field label="Order" hint="Lower first" error={errors.order}>
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
        hint="Used for the filter on the Shop page, e.g. Oils"
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
          defaultChecked={product?.inStock ?? true}
        />
        <Checkbox
          name="published"
          label="Show on the website"
          defaultChecked={product?.published ?? true}
        />
        <Checkbox
          name="featured"
          label="Feature on the home page"
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
