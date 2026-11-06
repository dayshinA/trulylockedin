"use client";

import { useState } from "react";

import { penceToPounds } from "@/lib/booking/admin-forms";
import {
  WEEKDAYS,
  type BookingSettings,
  type Weekday,
  type WeeklyHours,
} from "@/types/booking";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  useAdminForm,
} from "../_components/admin-form";
import {
  saveBookingRulesAction,
  saveOverrideAction,
  saveWeeklyHoursAction,
} from "./actions";
import { FieldError } from "@/components/forms/field-error";

const DAY_NAMES: Record<Weekday, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

// Monday first, as people in the UK read a week.
const WEEK_ORDER: Weekday[] = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

const timeClass = `${inputClass} w-28`;

function TimePair({
  prefix,
  n,
  start,
  end,
  label,
}: {
  prefix: string;
  n: 1 | 2;
  start?: string;
  end?: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        name={`${prefix}start${n}`}
        defaultValue={start}
        step={300}
        aria-label={`${label} opens`}
        className={timeClass}
      />
      <span className="text-muted">to</span>
      <input
        type="time"
        name={`${prefix}end${n}`}
        defaultValue={end}
        step={300}
        aria-label={`${label} closes`}
        className={timeClass}
      />
    </div>
  );
}

export function WeeklyHoursForm({ weekly }: { weekly: WeeklyHours }) {
  const { state, pending, onSubmit } = useAdminForm(saveWeeklyHoursAction);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="border-t border-line">
        {WEEK_ORDER.map((day) => (
          <DayRow
            key={day}
            day={day}
            windows={weekly[day]}
            error={errors[day]}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        Add a second time range for a break (e.g. 09:00–13:00 and 14:00–18:00).
      </p>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save opening hours</SubmitButton>
    </form>
  );
}

function DayRow({
  day,
  windows,
  error,
}: {
  day: Weekday;
  windows: WeeklyHours[Weekday];
  error?: string[];
}) {
  const [open, setOpen] = useState(windows.length > 0);
  const [split, setSplit] = useState(windows.length > 1);
  const prefix = `${day}.`;

  return (
    <fieldset
      data-invalid={error?.[0] ? "" : undefined}
      className="flex flex-col gap-2 border-b border-line py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="sr-only">{DAY_NAMES[day]}</legend>
        <label className="flex min-h-11 items-center gap-3 font-display text-xl font-semibold">
          <input
            type="checkbox"
            name={`${day}.open`}
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="size-5 accent-brand"
          />
          {DAY_NAMES[day]}
        </label>
        {!open && <span className="text-sm text-muted">Closed</span>}
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <TimePair
            prefix={prefix}
            n={1}
            start={windows[0]?.start ?? "09:00"}
            end={windows[0]?.end ?? "17:00"}
            label={DAY_NAMES[day]}
          />
          {split ? (
            <TimePair
              prefix={prefix}
              n={2}
              start={windows[1]?.start}
              end={windows[1]?.end}
              label={`${DAY_NAMES[day]} second session`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSplit(true)}
              className="min-h-11 w-fit text-sm text-brand underline-offset-4 hover:underline pointer-coarse:underline"
            >
              + Add a break
            </button>
          )}
        </div>
      )}
      {error?.[0] && <FieldError>{error[0]}</FieldError>}
    </fieldset>
  );
}

export function BookingRulesForm({ settings }: { settings: BookingSettings }) {
  const { state, pending, onSubmit } = useAdminForm(saveBookingRulesAction);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Time slots every"
          hint="How often start times are offered"
          error={errors.slotIntervalMin}
        >
          <select
            name="slotIntervalMin"
            defaultValue={settings.slotIntervalMin}
            className={inputClass}
          >
            {[15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </Field>
        <Field label="Break between clients (minutes)" error={errors.bufferMin}>
          <input
            name="bufferMin"
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            step={5}
            defaultValue={settings.bufferMin}
            className={inputClass}
          />
        </Field>
        <Field
          label="Minimum notice (hours)"
          hint="Also how late clients can cancel online"
          error={errors.minNoticeHours}
        >
          <input
            name="minNoticeHours"
            type="number"
            inputMode="numeric"
            min={0}
            max={1440}
            defaultValue={settings.minNoticeHours}
            className={inputClass}
          />
        </Field>
        <Field label="Bookings open (days ahead)" error={errors.maxAdvanceDays}>
          <input
            name="maxAdvanceDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={730}
            defaultValue={settings.maxAdvanceDays}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Deposit (£)"
        hint="Paid online when booking a service that takes a deposit. Paying it confirms the booking. 0 turns deposits off."
        error={errors.depositPence}
      >
        <input
          name="deposit"
          inputMode="decimal"
          defaultValue={penceToPounds(settings.depositPence)}
          className={`${inputClass} sm:max-w-40`}
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save booking rules</SubmitButton>
    </form>
  );
}

export function OverrideForm({ today }: { today: string }) {
  const { state, pending, onSubmit } = useAdminForm(saveOverrideAction);
  const [kind, setKind] = useState<"closed" | "hours" | "adjust">("closed");
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Date" error={errors.date}>
        <input
          name="date"
          type="date"
          min={today}
          required
          className={`${inputClass} w-48`}
        />
      </Field>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1 text-muted">What&rsquo;s different?</legend>
        {(
          [
            ["closed", "Closed all day"],
            ["hours", "Different opening hours"],
            ["adjust", "Normal hours, but block or add specific times"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => setKind(value)}
              className="size-5 accent-brand"
            />
            {label}
          </label>
        ))}
      </fieldset>

      {kind === "hours" && (
        <Field label="Opening hours that day" error={errors.start1}>
          <span className="flex flex-col gap-2">
            <TimePair prefix="" n={1} label="That day" />
            <TimePair prefix="" n={2} label="That day second session" />
          </span>
        </Field>
      )}

      {kind !== "closed" && (
        <>
          <Field
            label="Block these start times"
            hint="No appointment will run through them, e.g. 13:00, 13:30"
            error={errors.blockedSlots}
          >
            <input name="blockedSlots" className={inputClass} />
          </Field>
          <Field
            label="Add extra start times"
            hint="Offered even outside opening hours, e.g. 18:00"
            error={errors.extraSlots}
          >
            <input name="extraSlots" className={inputClass} />
          </Field>
        </>
      )}

      <p className="text-xs text-muted">
        Saving replaces anything already set for that date. Existing bookings
        are not affected.
      </p>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save for this date</SubmitButton>
    </form>
  );
}
