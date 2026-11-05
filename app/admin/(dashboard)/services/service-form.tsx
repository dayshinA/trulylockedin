"use client";

import { penceToPounds } from "@/lib/booking/admin-forms";
import type { Service, ServiceCategory } from "@/types/booking";
import {
  Checkbox,
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../_components/admin-form";
import { saveServiceAction } from "./actions";
import { OptionsEditor } from "./options-editor";
import { ServiceImageField } from "./service-image-field";

export function ServiceForm({
  service,
  categories,
}: {
  service?: Service;
  categories: ServiceCategory[];
}) {
  const { state, pending, onSubmit } = useAdminForm(saveServiceAction);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {service && <input type="hidden" name="id" value={service.id} />}

      <Field label="Name" error={errors.name}>
        <input
          name="name"
          defaultValue={service?.name}
          required
          className={inputClass}
        />
      </Field>
      <Field
        label="Web address (slug)"
        hint={
          service
            ? undefined
            : "Leave empty to make one from the name, e.g. retwist-style"
        }
        error={errors.slug}
      >
        <input
          name="slug"
          defaultValue={service?.slug}
          autoCapitalize="none"
          className={inputClass}
        />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea
          name="description"
          rows={3}
          defaultValue={service?.description}
          className={`${inputClass} py-2`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Duration (minutes)"
          hint="Leave empty if it varies. It can't be booked until it has one."
          error={errors.durationMin}
        >
          <input
            name="durationMin"
            type="number"
            inputMode="numeric"
            min={15}
            max={720}
            step={15}
            defaultValue={service ? (service.durationMin ?? "") : 60}
            className={inputClass}
          />
        </Field>
        <Field
          label="Base price (£)"
          hint="Options are added to this. 0 shows as Free"
          error={errors.price}
        >
          <input
            name="price"
            inputMode="decimal"
            defaultValue={
              service ? penceToPounds(service.priceFromPence) : undefined
            }
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Note beside the price (optional)"
        hint="e.g. Up to 100 locs, or Per strand"
        error={errors.priceLabel}
      >
        <input
          name="priceLabel"
          defaultValue={service?.priceLabel}
          className={inputClass}
        />
      </Field>

      <Field label="Deposit note (optional)" error={errors.depositNote}>
        <input
          name="depositNote"
          defaultValue={service?.depositNote}
          placeholder="A deposit is required to secure this appointment."
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" error={errors.categoryId}>
          <select
            name="categoryId"
            defaultValue={service?.categoryId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Display order"
          hint="Lower numbers show first"
          error={errors.order}
        >
          <input
            name="order"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={service?.order ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <OptionsEditor service={service} errors={errors} />

      <ServiceImageField
        key={service?.imagePublicId}
        initial={service?.imagePublicId}
        error={errors.imagePublicId}
      />

      <Checkbox
        name="active"
        label="Show on the website"
        defaultChecked={service?.active ?? true}
      />
      <Checkbox
        name="onlineBooking"
        label="Bookable online"
        defaultChecked={service?.onlineBooking ?? true}
      />
      <Checkbox
        name="depositRequired"
        label="Takes a deposit when booked online (the amount is set under Availability → Booking rules)"
        defaultChecked={service?.depositRequired ?? true}
      />

      <FormMessage state={state} />
      <SubmitButton pending={pending}>
        {service ? "Save changes" : "Add service"}
      </SubmitButton>
    </form>
  );
}
