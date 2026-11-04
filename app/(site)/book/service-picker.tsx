"use client";

import { ChevronDown } from "lucide-react";
import { useEffect } from "react";

import { OptionPicker } from "@/components/site/option-picker";
import { quoteService } from "@/lib/booking/quote";
import { formatDuration, formatPriceFrom } from "@/lib/format";
import type { Service } from "@/types/booking";

export type BookableService = Pick<
  Service,
  | "id"
  | "name"
  | "description"
  | "priceFromPence"
  | "priceLabel"
  | "depositNote"
  | "options"
  | "optionsSelectionMode"
  | "optionsRequired"
> & { durationMin: number };

export type BookableCategory = {
  id: string;
  name: string;
  services: BookableService[];
};

// Running totals, including while a required option is still unpicked.
export function totalsOf(service: BookableService, optionIds: string[]) {
  const result = quoteService(service, optionIds, "owner");
  return result.ok
    ? {
        options: result.quote.options,
        pricePence: result.quote.pricePence,
        durationMin: result.quote.durationMin ?? service.durationMin,
      }
    : {
        options: [],
        pricePence: service.priceFromPence,
        durationMin: service.durationMin,
      };
}

const PANEL_MS = 200;
// Clears the fixed site header.
export const HEADER_CLEARANCE_PX = 96;

const rowFocus =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

// Step one: categories that open to services, and services that open to their
// details and options. One service is open at a time, because it's the one
// being booked.
export function ServicePicker({
  catalogue,
  openCategoryIds,
  service,
  optionIds,
  onToggleCategory,
  onToggleService,
  onOptionsChange,
  onContinue,
}: {
  catalogue: BookableCategory[];
  openCategoryIds: string[];
  service: BookableService | null;
  optionIds: string[];
  onToggleCategory: (categoryId: string) => void;
  onToggleService: (service: BookableService) => void;
  onOptionsChange: (optionIds: string[]) => void;
  onContinue: () => void;
}) {
  const openServiceId = service?.id;

  // Closing the previous service can pull the one just tapped above the top of
  // the screen, so bring it back once the panels have settled.
  useEffect(() => {
    if (!openServiceId) return;
    const timer = setTimeout(() => {
      const top = document
        .getElementById(`service-${openServiceId}-toggle`)
        ?.getBoundingClientRect().top;
      if (top !== undefined && top < HEADER_CLEARANCE_PX) {
        window.scrollBy({ top: top - HEADER_CLEARANCE_PX, behavior: "smooth" });
      }
    }, PANEL_MS + 20);
    return () => clearTimeout(timer);
  }, [openServiceId]);

  return (
    <ul className="mt-8 border-t border-line">
      {catalogue.map((category) => {
        const open = openCategoryIds.includes(category.id);
        const panelId = `category-${category.id}`;
        return (
          <li key={category.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggleCategory(category.id)}
                className={`group flex min-h-18 w-full items-center gap-4 px-3 py-4 text-left transition-colors hover:bg-brand/10 ${rowFocus}`}
              >
                <span className="min-w-0 flex-1 font-display text-3xl font-semibold text-ink transition-colors group-hover:text-brand">
                  {category.name}
                </span>
                <span className="shrink-0 text-sm text-muted">
                  {category.services.length}{" "}
                  {category.services.length === 1 ? "service" : "services"}
                </span>
                <Chevron open={open} />
              </button>
            </h3>
            <Collapsible id={panelId} open={open}>
              <ul className="border-t border-line sm:ml-3">
                {category.services.map((s) => (
                  <ServiceItem
                    key={s.id}
                    service={s}
                    open={s.id === openServiceId}
                    optionIds={s.id === openServiceId ? optionIds : []}
                    onToggle={() => onToggleService(s)}
                    onOptionsChange={onOptionsChange}
                    onContinue={onContinue}
                  />
                ))}
              </ul>
            </Collapsible>
          </li>
        );
      })}
    </ul>
  );
}

function ServiceItem({
  service,
  open,
  optionIds,
  onToggle,
  onOptionsChange,
  onContinue,
}: {
  service: BookableService;
  open: boolean;
  optionIds: string[];
  onToggle: () => void;
  onOptionsChange: (optionIds: string[]) => void;
  onContinue: () => void;
}) {
  const panelId = `service-${service.id}`;
  const totals = totalsOf(service, optionIds);
  const hasOptions = service.options.length > 0;

  return (
    <li
      className={`border-b border-line transition-colors last:border-b-0 ${open ? "bg-brand/5" : ""}`}
    >
      <h4>
        <button
          id={`${panelId}-toggle`}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={`group flex min-h-16 w-full items-center gap-4 px-3 py-3 text-left transition-colors hover:bg-brand/10 ${rowFocus}`}
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block font-display text-2xl font-semibold transition-colors group-hover:text-brand ${
                open ? "text-brand" : "text-ink"
              }`}
            >
              {service.name}
            </span>
            <span className="block text-sm text-muted">
              {formatDuration(service.durationMin)}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-accent-ink">
            {formatPriceFrom(service.priceFromPence)}
          </span>
          <Chevron open={open} small />
        </button>
      </h4>
      <Collapsible id={panelId} open={open}>
        <div className="flex flex-col gap-4 px-3 pt-1 pb-6">
          {service.description && (
            <p className="max-w-prose text-muted">{service.description}</p>
          )}
          {service.priceLabel && (
            <p className="max-w-prose text-sm text-muted">{service.priceLabel}</p>
          )}
          {service.depositNote && (
            <p className="max-w-prose text-sm text-ink">{service.depositNote}</p>
          )}
          {hasOptions && (
            <div className="max-w-xl">
              <OptionPicker
                name={`options-${service.id}`}
                service={service}
                selected={optionIds}
                onChange={onOptionsChange}
              />
              <p className="mt-4 text-sm text-muted" aria-live="polite">
                Your total: {formatDuration(totals.durationMin)} ·{" "}
                {formatPriceFrom(totals.pricePence)}
              </p>
            </div>
          )}
          <button
            type="button"
            disabled={!quoteService(service, optionIds).ok}
            onClick={onContinue}
            className="min-h-12 rounded-full bg-brand px-10 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted sm:w-fit"
          >
            Pick a time
          </button>
        </div>
      </Collapsible>
    </li>
  );
}

function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  return (
    <ChevronDown
      aria-hidden
      className={`shrink-0 text-brand transition-transform duration-200 motion-reduce:transition-none ${
        small ? "size-5" : "size-6"
      } ${open ? "rotate-180" : ""}`}
    />
  );
}

// Stays mounted while closed so the height can animate; `inert` keeps the hidden
// controls out of the tab order and away from screen readers.
function Collapsible({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      inert={!open}
      style={{ transitionDuration: `${PANEL_MS}ms` }}
      className={`grid transition-[grid-template-rows] ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
