"use client";

import { penceToPounds } from "@/lib/booking/admin-forms";
import type { Service } from "@/types/booking";
import {
  Checkbox,
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../_components/admin-form";
import { saveServiceAction } from "./actions";
import { ServiceImageField } from "./service-image-field";

export function ServiceForm({ service }: { service?: Service }) {
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
          hint="Include the full appointment time"
          error={errors.durationMin}
        >
          <input
            name="durationMin"
            type="number"
            inputMode="numeric"
            min={15}
            max={720}
            step={15}
            defaultValue={service?.durationMin ?? 60}
            className={inputClass}
          />
        </Field>
        <Field
          label="Price from (£)"
          hint="0 shows as Free"
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

      <Field label="Deposit note (optional)" error={errors.depositNote}>
        <input
          name="depositNote"
          defaultValue={service?.depositNote}
          placeholder="A deposit is required to secure this appointment."
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category (optional)" error={errors.category}>
          <input
            name="category"
            defaultValue={service?.category}
            className={inputClass}
          />
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

      <ServiceImageField
        key={service?.imagePublicId}
        initial={service?.imagePublicId}
        error={errors.imagePublicId}
      />

      <Checkbox
        name="active"
        label="Bookable online"
        defaultChecked={service?.active ?? true}
      />

      <FormMessage state={state} />
      <SubmitButton pending={pending}>
        {service ? "Save changes" : "Add service"}
      </SubmitButton>
    </form>
  );
}
