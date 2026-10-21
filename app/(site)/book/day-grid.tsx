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

// Month calendar limited to the bookable window [first, last].
export function DayGrid({
  first,
  last,
  selected,
  onSelect,
}: {
  first: LocalDate;
  last: LocalDate;
  selected: LocalDate | null;
  onSelect: (date: LocalDate) => void;
}) {
  const [month, setMonth] = useState(() => (selected ?? first).slice(0, 7));
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
          <span key={day} aria-hidden className="pb-2 text-xs text-sand">
            {day}
          </span>
        ))}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;
          const bookable = date >= first && date <= last;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              disabled={!bookable}
              aria-pressed={isSelected}
              aria-label={formatLocalDate(date, "long")}
              onClick={() => onSelect(date)}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-sm border transition-colors ${
                isSelected
                  ? "border-gold bg-gold font-semibold text-espresso"
                  : bookable
                    ? "border-brown text-cream hover:border-gold"
                    : "border-transparent text-caramel"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
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
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-brown text-cream transition-colors hover:border-gold disabled:border-transparent disabled:text-caramel"
    >
      {children}
    </button>
  );
}
