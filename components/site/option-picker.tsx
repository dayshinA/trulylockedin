import { formatDuration, formatOptionPrice } from "@/lib/format";
import type { Service } from "@/types/booking";

// Radios or tick boxes for a service's options, used by the public booking flow
// and the owner's manual booking form. `owner` may leave a required choice empty.
export function OptionPicker({
  service,
  selected,
  onChange,
  owner = false,
  // Radios sharing a name act as one group, so several pickers on a page each
  // need their own.
  name = "optionIds",
}: {
  service: Pick<
    Service,
    "options" | "optionsSelectionMode" | "optionsRequired"
  >;
  selected: string[];
  onChange: (optionIds: string[]) => void;
  owner?: boolean;
  name?: string;
}) {
  const single = service.optionsSelectionMode === "single";
  const required = service.optionsRequired && !owner;
  const legend = single
    ? required
      ? "Choose one"
      : "Choose one (optional)"
    : required
      ? "Choose at least one"
      : "Add any you'd like (optional)";

  const row =
    "flex min-h-12 cursor-pointer items-center gap-3 border-b border-line px-3 py-3 text-sm transition-colors hover:bg-brand/10 has-checked:bg-brand/10 has-checked:font-semibold";
  const control = "size-5 shrink-0 accent-brand";

  return (
    <fieldset>
      <legend className="text-sm text-muted">{legend}</legend>
      <div className="mt-3 border-t border-line">
        {single && !required && (
          <label className={row}>
            <input
              type="radio"
              name={name}
              value=""
              checked={selected.length === 0}
              onChange={() => onChange([])}
              className={control}
            />
            <span className="flex-1 text-ink">None</span>
          </label>
        )}
        {service.options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <label key={option.id} className={row}>
              <input
                type={single ? "radio" : "checkbox"}
                name={name}
                value={option.id}
                checked={isSelected}
                onChange={() =>
                  onChange(
                    single
                      ? [option.id]
                      : isSelected
                        ? selected.filter((id) => id !== option.id)
                        : [...selected, option.id],
                  )
                }
                className={control}
              />
              <span className="min-w-0 flex-1 text-ink">{option.name}</span>
              <span className="shrink-0 text-right text-muted">
                {formatOptionPrice(option.pricePence)}
                {option.durationMin !== null && (
                  <span className="block text-xs">
                    +{formatDuration(option.durationMin)}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
