"use client";

import { useRef, useState } from "react";

import { penceToPounds, type FieldErrors } from "@/lib/booking/admin-forms";
import type { Service, ServiceOption } from "@/types/booking";
import { Checkbox, Field, inputClass } from "../_components/admin-form";
import { smallButton } from "../_components/admin-ui";
import { FieldError } from "@/components/forms/field-error";

const MAX_OPTIONS = 50;

// Repeated rows: each field posts under one name, read in order on the server.
export function OptionsEditor({
  service,
  errors,
}: {
  service?: Service;
  errors: FieldErrors;
}) {
  const initial = service?.options ?? [];
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState<
    { key: number; option: ServiceOption | null }[]
  >(() => initial.map((option, key) => ({ key, option })));

  function move(index: number, by: -1 | 1) {
    setRows((current) => {
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });
  }

  return (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
      <legend className="font-display text-2xl font-semibold">Options</legend>
      <p className="-mt-2 text-sm text-muted">
        Choices clients pick when booking, like loc count, length or an
        add-on. Each one adds its price and time to the service, so a longer
        option leaves fewer free times. Leave the options empty if the service
        has no choices.
      </p>

      {rows.map(({ key, option }, i) => (
        <div
          key={key}
          className="flex flex-col gap-3 border-l-2 border-line pl-4"
        >
          <input type="hidden" name="optionId" value={option?.id ?? ""} />
          <Field label="Option name" error={errors[`optionName.${i}`]}>
            <input
              name="optionName"
              defaultValue={option?.name}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Adds (£)"
              hint="0 if it doesn't change the price"
              error={errors[`optionPrice.${i}`]}
            >
              <input
                name="optionPrice"
                inputMode="decimal"
                defaultValue={option ? penceToPounds(option.pricePence) : ""}
                className={inputClass}
              />
            </Field>
            <Field
              label="Adds (minutes)"
              hint="Empty if it takes no extra time"
              error={errors[`optionMinutes.${i}`]}
            >
              <input
                name="optionMinutes"
                type="number"
                inputMode="numeric"
                min={5}
                max={720}
                step={5}
                defaultValue={option?.durationMin ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className={smallButton}
            >
              Move up
            </button>
            <button
              type="button"
              disabled={i === rows.length - 1}
              onClick={() => move(i, 1)}
              className={smallButton}
            >
              Move down
            </button>
            <button
              type="button"
              onClick={() =>
                setRows((current) => current.filter((row) => row.key !== key))
              }
              className={smallButton}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {rows.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: nextKey.current++, option: null },
            ])
          }
          className={`${smallButton} w-fit`}
        >
          + Add an option
        </button>
      )}
      {errors.options?.[0] && (
        <FieldError>{errors.options[0]}</FieldError>
      )}

      <Field
        label="How many can a client pick?"
        hint="“Only one” for sizes or lengths; “Any number” for add-ons."
      >
        <select
          name="optionsSelectionMode"
          defaultValue={service?.optionsSelectionMode ?? "multiple"}
          className={inputClass}
        >
          <option value="multiple">Any number</option>
          <option value="single">Only one</option>
        </select>
      </Field>
      <div>
        <Checkbox
          name="optionsRequired"
          label="Clients must pick at least one"
          hint="Tick it when the price depends on the choice, e.g. small, medium or large."
          defaultChecked={service?.optionsRequired ?? false}
        />
        {errors.optionsRequired?.[0] && (
          <FieldError>{errors.optionsRequired[0]}</FieldError>
        )}
      </div>
    </fieldset>
  );
}
