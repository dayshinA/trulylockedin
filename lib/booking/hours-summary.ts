import { WEEKDAYS, type Weekday, type WeeklyHours } from "@/types/booking";

const SHORT: Record<Weekday, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

// Monday-first, consecutive days with identical hours merged:
// [{ days: "Tue–Fri", hours: "09:00–18:00" }, { days: "Sun–Mon", hours: "Closed" }]
export function summarizeWeeklyHours(
  weekly: WeeklyHours,
): { days: string; hours: string }[] {
  const order: Weekday[] = [...WEEKDAYS.slice(1), WEEKDAYS[0]];
  const label = (day: Weekday) =>
    weekly[day].length === 0
      ? "Closed"
      : weekly[day].map((w) => `${w.start}–${w.end}`).join(", ");

  const rows: { first: Weekday; last: Weekday; hours: string }[] = [];
  for (const day of order) {
    const hours = label(day);
    const previous = rows.at(-1);
    if (previous && previous.hours === hours) previous.last = day;
    else rows.push({ first: day, last: day, hours });
  }
  return rows.map(({ first, last, hours }) => ({
    days: first === last ? SHORT[first] : `${SHORT[first]}–${SHORT[last]}`,
    hours,
  }));
}
