"use client";

import { useEffect, type RefObject } from "react";

const CONTROL =
  "input:not([type=hidden]):not([tabindex='-1']), select, textarea, button";

// After a failed submit, take the user to the first field with an error: mark
// the wrong fields aria-invalid, focus the first one and scroll it to the
// middle of the screen (on a phone the submit button is usually far below
// it). Pass anything that changes on every failed submit, e.g. the
// fieldErrors object or the action state; nothing happens while it's empty.
//
// Once the user edits a wrong field, its error is hidden (`data-fixed`, see
// globals.css) until the next submit says otherwise. The attribute is set
// straight on the DOM: React doesn't own it, so it never fights a render.
export function useErrorFocus(
  formRef: RefObject<HTMLElement | null>,
  trigger: unknown,
) {
  useEffect(() => {
    const form = formRef.current;
    if (!form || !hasErrors(trigger)) return;

    for (const el of form.querySelectorAll("[data-fixed]")) {
      el.removeAttribute("data-fixed");
    }

    for (const el of form.querySelectorAll("[aria-invalid]")) {
      if (!el.closest("[data-invalid]")) el.removeAttribute("aria-invalid");
    }
    for (const el of form.querySelectorAll(
      "[data-invalid] :is(input, select, textarea)",
    )) {
      el.setAttribute("aria-invalid", "true");
    }

    const first = form.querySelector("[data-field-error]");
    if (first) {
      const container =
        first.closest<HTMLElement>("[data-invalid]") ??
        first.parentElement ??
        (first as HTMLElement);
      const control = container.querySelector<HTMLElement>(CONTROL);
      control?.focus({ preventScroll: true });
      container.scrollIntoView({ block: "center", behavior: "instant" });
    }

    function markFixed(event: Event) {
      const field = (event.target as Element | null)?.closest("[data-invalid]");
      if (!field || !form?.contains(field)) return;
      field.setAttribute("data-fixed", "");
      for (const el of field.querySelectorAll("[aria-invalid]")) {
        el.removeAttribute("aria-invalid");
      }
    }
    form.addEventListener("input", markFixed);
    form.addEventListener("change", markFixed);
    return () => {
      form.removeEventListener("input", markFixed);
      form.removeEventListener("change", markFixed);
    };
  }, [formRef, trigger]);
}

function hasErrors(trigger: unknown): boolean {
  if (!trigger) return false;
  if (typeof trigger !== "object") return true;
  if ("status" in trigger) return trigger.status === "error";
  return Object.keys(trigger).length > 0;
}
