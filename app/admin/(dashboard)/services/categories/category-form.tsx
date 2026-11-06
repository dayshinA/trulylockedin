"use client";

import type { ServiceCategory } from "@/types/booking";
import {
  Checkbox,
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../../_components/admin-form";
import { smallButton } from "../../_components/admin-ui";
import { deleteCategoryAction, saveCategoryAction } from "../actions";

// With no category it's the "add" form.
export function CategoryForm({
  category,
  serviceCount = 0,
  nextOrder = 0,
}: {
  category?: ServiceCategory;
  serviceCount?: number;
  nextOrder?: number;
}) {
  const save = useAdminForm(saveCategoryAction);
  const remove = useAdminForm(deleteCategoryAction);
  const errors = save.state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <form onSubmit={save.onSubmit} className="flex flex-col gap-4" noValidate>
        {category && <input type="hidden" name="id" value={category.id} />}
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="Name" error={errors.name}>
            <input
              name="name"
              defaultValue={category?.name}
              className={inputClass}
            />
          </Field>
          <Field label="Order" error={errors.order}>
            <input
              name="order"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={category?.order ?? nextOrder}
              className={inputClass}
            />
          </Field>
        </div>
        <Checkbox
          name="visibleOnline"
          label="Show on the website"
          hint="Untick to hide this category and all its services from clients."
          defaultChecked={category?.visibleOnline ?? true}
        />
        <FormMessage state={save.state} />
        <SubmitButton pending={save.pending}>
          {category ? "Save" : "Add category"}
        </SubmitButton>
      </form>

      {category &&
        (serviceCount > 0 ? (
          <p className="text-xs text-muted">
            {serviceCount} service{serviceCount === 1 ? "" : "s"}. Move or delete
            them to remove this category.
          </p>
        ) : (
          <form onSubmit={remove.onSubmit}>
            <input type="hidden" name="id" value={category.id} />
            <button
              type="submit"
              disabled={remove.pending}
              className={smallButton}
            >
              Delete category
            </button>
            <FormMessage state={remove.state} />
          </form>
        ))}
    </div>
  );
}
