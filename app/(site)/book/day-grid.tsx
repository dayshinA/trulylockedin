"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { formatLocalDate, formatMonth } from "@/lib/format";
import type { LocalDate } from "@/types/booking";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "yyyy-mm" → that month's dates, padded at the start so Monday is column one.
function monthCells(month: string): (LocalDate | null)[] {
  const [year, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from(
      { length: count },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];
}

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Month calendar limited to the bookable window [first, last]. Once
// `openDays` has loaded, days without a free time are greyed out too; until
// then (or if it failed) every day in the window can be tapped.
export function DayGrid({
  first,
  last,
  selected,
  openDays,
  onSelect,
}: {
  first: LocalDate;
  last: LocalDate;
  selected: LocalDate | null;
  openDays: readonly LocalDate[] | null;
  onSelect: (date: LocalDate) => void;
}) {
  const [month, setMonth] = useState(() => (selected ?? first).slice(0, 7));
  // Follow the selection when it's moved for the client (e.g. to the first
  // open day, in another month).
  const [shownSelection, setShownSelection] = useState(selected);
  if (selected !== shownSelection) {
    setShownSelection(selected);
    if (selected) setMonth(selected.slice(0, 7));
  }
  const open = openDays ? new Set(openDays) : null;
  const canGoBack = month > first.slice(0, 7);
  const canGoForward = month < last.slice(0, 7);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h3 aria-live="polite" className="font-display text-2xl font-semibold">
          {formatMonth(month)}
        </h3>
        <div className="flex gap-1">
          <MonthButton
            label="Previous month"
            disabled={!canGoBack}
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </MonthButton>
          <MonthButton
            label="Next month"
            disabled={!canGoForward}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden className="size-5" />
          </MonthButton>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} aria-hidden className="pb-2 text-xs text-muted">
            {day}
          </span>
        ))}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;
          const inWindow = date >= first && date <= last;
          const bookable = inWindow && (!open || open.has(date));
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              disabled={!bookable}
              aria-pressed={isSelected}
              aria-label={
                inWindow && !bookable
                  ? `${formatLocalDate(date, "long")}, no free times`
                  : formatLocalDate(date, "long")
              }
              onClick={() => onSelect(date)}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-sm border transition-colors ${
                isSelected
                  ? "border-brand bg-brand font-semibold text-on-brand"
                  : bookable
                    ? "border-line text-ink hover:border-brand hover:bg-brand hover:text-on-brand"
                    : inWindow
                      ? "border-transparent text-faint line-through decoration-faint"
                      : "border-transparent text-faint"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      {open && (
        <p className="mt-3 text-xs text-muted">
          Crossed-out days have no free times.
        </p>
      )}
    </div>
  );
}

function MonthButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line text-ink transition-colors enabled:hover:border-brand enabled:hover:bg-brand/10 disabled:border-transparent disabled:text-faint"
    >
      {children}
    </button>
  );
}
