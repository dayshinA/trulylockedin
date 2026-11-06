"use client";

import { useState } from "react";

import { penceToPounds } from "@/lib/booking/admin-forms";
import { formatDuration } from "@/lib/format";
import {
  WEEKDAYS,
  type BookingSettings,
  type DayRules,
  type TimeWindow,
  type Weekday,
  type WeeklySchedule,
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
const selectClass = `${inputClass} w-auto`;

const GAP_CHOICES = [30, 45, 60, 90, 120, 180];
const CHAIR_CHOICES = [1, 2, 3, 4];

// Keeps a stored value selectable even if it isn't one of the usual choices.
const withValue = (choices: number[], value?: number) =>
  value === undefined || choices.includes(value)
    ? choices
    : [...choices, value].sort((a, b) => a - b);

// "Every" and "Chairs" for a day or a special date. Empty = the default.
function DayRuleSelects({
  prefix,
  rules,
  defaultLabel,
}: {
  prefix: string;
  rules?: DayRules;
  defaultLabel: { stepMin: string; chairs: string };
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm text-muted">
        Every
        <select
          name={`${prefix}stepMin`}
          defaultValue={rules?.stepMin ?? ""}
          className={selectClass}
        >
          <option value="">{defaultLabel.stepMin}</option>
          {withValue(GAP_CHOICES, rules?.stepMin).map((m) => (
            <option key={m} value={m}>
              {formatDuration(m)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        Chairs
        <select
          name={`${prefix}chairs`}
          defaultValue={rules?.chairs ?? ""}
          className={selectClass}
        >
          <option value="">{defaultLabel.chairs}</option>
          {withValue(CHAIR_CHOICES, rules?.chairs).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

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

export function WeeklyHoursForm({
  weekly,
  settings,
}: {
  weekly: WeeklySchedule;
  settings: BookingSettings;
}) {
  const { state, pending, onSubmit } = useAdminForm(saveWeeklyHoursAction);
  const errors = state.fieldErrors ?? {};
  const defaultLabel = {
    stepMin: `Default (${formatDuration(settings.slotIntervalMin)})`,
    chairs: `Default (${settings.chairs})`,
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="border-t border-line">
        {WEEK_ORDER.map((day) => (
          <DayRow
            key={day}
            day={day}
            windows={weekly.hours[day]}
            rules={weekly.rules[day]}
            defaultLabel={defaultLabel}
            error={errors[day]}
          />
        ))}
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-muted">
        <li>
          A closing time earlier than the opening time (like 03:00) means the
          next morning.
        </li>
        <li>
          Add a second time range for a break (e.g. 13:00–17:00 and
          18:00–03:00).
        </li>
        <li>
          &ldquo;Every&rdquo; is the gap between start times: pick 2 hours on
          days you work alone. &ldquo;Chairs&rdquo; is how many clients can be
          in at the same time. Clients never see the chairs.
        </li>
      </ul>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save opening hours</SubmitButton>
    </form>
  );
}

function DayRow({
  day,
  windows,
  rules,
  defaultLabel,
  error,
}: {
  day: Weekday;
  windows: TimeWindow[];
  rules?: DayRules;
  defaultLabel: { stepMin: string; chairs: string };
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
        <div className="flex flex-col gap-3">
          <TimePair
            prefix={prefix}
            n={1}
            start={windows[0]?.start ?? "13:00"}
            end={windows[0]?.end ?? "21:00"}
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
          <DayRuleSelects
            prefix={prefix}
            rules={rules}
            defaultLabel={defaultLabel}
          />
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
          label="Default gap between start times"
          hint="How often start times are offered, e.g. every hour: 13:00, 14:00, 15:00… Used on days where you haven't picked one."
          error={errors.slotIntervalMin}
        >
          <select
            name="slotIntervalMin"
            defaultValue={settings.slotIntervalMin}
            className={inputClass}
          >
            {withValue(GAP_CHOICES, settings.slotIntervalMin).map((m) => (
              <option key={m} value={m}>
                {formatDuration(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Default chairs"
          hint="How many clients can be booked in at the same time, on days where you haven't picked. Use 1 if you work alone."
          error={errors.chairs}
        >
          <select
            name="chairs"
            defaultValue={settings.chairs}
            className={inputClass}
          >
            {CHAIR_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Time between two clients' starts (minutes)"
          hint="So you're never starting two clients at once. 0 lets them start together."
          error={errors.staggerMin}
        >
          <input
            name="staggerMin"
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            step={5}
            defaultValue={settings.staggerMin}
            className={inputClass}
          />
        </Field>
        <Field
          label="Break after each client (minutes)"
          hint="Time to tidy up and reset after each client. Nobody can book into it."
          error={errors.bufferMin}
        >
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
          hint="e.g. 24: nobody can book less than a day ahead, and clients can't cancel online in the last 24 hours before their appointment (they have to contact you)."
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
        <Field
          label="Bookings open (days ahead)"
          hint="e.g. 30: clients can book up to a month ahead. Raise it to open up later dates."
          error={errors.maxAdvanceDays}
        >
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
        label="Premium from"
        hint="Start times from this time, and after midnight, use each service's premium price (if you've given it one). Clients see it clearly before booking. Clear the box to turn premium times off."
        error={errors.premiumFrom}
      >
        <input
          name="premiumFrom"
          type="time"
          step={300}
          defaultValue={settings.premiumFrom ?? ""}
          className={`${inputClass} sm:max-w-40`}
        />
      </Field>
      <Field
        label="Deposit (£)"
        hint="Clients pay this by card when they book, and paying it confirms the booking. If the client cancels they lose it; it's refunded only when you cancel. 0 turns deposits off for every service."
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
        <fieldset
          data-invalid={errors.start1?.[0] ? "" : undefined}
          className="flex flex-col gap-3 text-sm"
        >
          <legend className="mb-2 text-muted">Opening hours that day</legend>
          <TimePair prefix="" n={1} label="That day" />
          <TimePair prefix="" n={2} label="That day second session" />
          <DayRuleSelects
            prefix=""
            defaultLabel={{ stepMin: "Same as usual", chairs: "Same as usual" }}
          />
          {errors.start1?.[0] ? (
            <FieldError>{errors.start1[0]}</FieldError>
          ) : (
            <span className="text-xs text-muted">
              Replaces that day&rsquo;s weekly hours. Leave the gap and chairs
              on &ldquo;Same as usual&rdquo; to keep the weekday&rsquo;s.
            </span>
          )}
        </fieldset>
      )}

      {kind !== "closed" && (
        <>
          <Field
            label="Block these start times"
            hint="Times you're busy that day, e.g. 13:00, 13:30. No appointment will be booked over them."
            error={errors.blockedSlots}
          >
            <input name="blockedSlots" className={inputClass} />
          </Field>
          <Field
            label="Add extra start times"
            hint="One-off start times to offer that day, even outside your hours, e.g. 18:00"
            error={errors.extraSlots}
          >
            <input name="extraSlots" className={inputClass} />
          </Field>
        </>
      )}

      <p className="text-xs text-muted">
        Saving replaces anything already set for that date. Bookings already
        made that day are not moved or cancelled: if you close a day that has
        bookings, contact those clients yourself.
      </p>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save for this date</SubmitButton>
    </form>
  );
}
