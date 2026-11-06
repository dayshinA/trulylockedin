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
import { Tip } from "../_components/help";
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

      <Field
        label="Name"
        hint="What clients see on the Services page and when booking."
        error={errors.name}
      >
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
            ? "Booking links you've already shared keep working whatever you put here."
            : "Used in the link that opens booking on this service. Leave it empty and one is made from the name, e.g. retwist-style."
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
      <Field
        label="Description"
        hint="A sentence or two about what's included. Shown under the name on the website."
        error={errors.description}
      >
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
          hint="How long the appointment takes, so the website knows which times are free. Without one, clients are asked to get in touch instead of booking."
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
          hint="The starting price clients see. Any options they pick are added on top. 0 shows as Free."
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
        <Field
          label="Premium price (£, optional)"
          hint="Charged instead of the base price for late-night start times (you set the time under Availability → Booking rules). Leave empty to charge the normal price at any time."
          error={errors.premiumPrice}
        >
          <input
            name="premiumPrice"
            inputMode="decimal"
            defaultValue={
              service?.premiumPricePence !== undefined
                ? penceToPounds(service.premiumPricePence)
                : undefined
            }
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Note beside the price (optional)"
        hint="Small text next to the price, e.g. Up to 100 locs, or Per strand"
        error={errors.priceLabel}
      >
        <input
          name="priceLabel"
          defaultValue={service?.priceLabel}
          className={inputClass}
        />
      </Field>

      <Field
        label="Deposit note (optional)"
        hint="Extra text shown with this service on the Services page and when booking. It doesn't change the deposit amount."
        error={errors.depositNote}
      >
        <input
          name="depositNote"
          defaultValue={service?.depositNote}
          placeholder="A deposit is required to secure this appointment."
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Category"
          hint="The heading it's listed under"
          error={errors.categoryId}
        >
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
          hint="Its place in the list: 0 shows first, then 1, 2…"
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

      <div className="flex flex-col gap-1 border-t border-line pt-5">
        <Checkbox
          name="active"
          label="Show on the website"
          hint="Untick to hide it everywhere on the website, for example while you're not offering it. You can still add bookings for it yourself."
          defaultChecked={service?.active ?? true}
        />
        <Checkbox
          name="onlineBooking"
          label="Bookable online"
          hint="Untick to keep it on the price list but have clients contact you to book, e.g. for a consultation first."
          defaultChecked={service?.onlineBooking ?? true}
        />
        <Checkbox
          name="depositRequired"
          label="Takes a deposit when booked online"
          hint="Clients pay the deposit by card to secure the time. The amount is the same for every service and is set under Availability → Booking rules."
          defaultChecked={service?.depositRequired ?? true}
        />
      </div>

      <Tip>
        Changes show on the website as soon as you save. Bookings already
        made keep the price and length they were booked at.
      </Tip>

      <FormMessage state={state} />
      <SubmitButton pending={pending}>
        {service ? "Save changes" : "Add service"}
      </SubmitButton>
    </form>
  );
}
