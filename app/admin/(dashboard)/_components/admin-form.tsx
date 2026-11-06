"use client";

import { startTransition, useActionState, useRef } from "react";

import { FieldError, FormNotice } from "@/components/forms/field-error";
import { useErrorFocus } from "@/lib/use-error-focus";

import { primaryButton } from "./admin-ui";
import { IDLE, type FormState } from "./form-state";

export const inputClass =
  "min-h-12 w-full rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand";

// Submits through onSubmit rather than <form action>, so React doesn't reset
// the fields after a failed save and the owner keeps what they typed. After a
// failed save it moves to the first field with an error (useErrorFocus).
export function useAdminForm(
  action: (previous: FormState, formData: FormData) => Promise<FormState>,
) {
  const [state, dispatch, pending] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement | null>(null);
  useErrorFocus(formRef, state);
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formRef.current = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }
  return { state, pending, onSubmit };
}

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const message = error?.[0];
  return (
    <label
      data-invalid={message ? "" : undefined}
      className={`flex flex-col gap-2 text-sm ${className}`}
    >
      <span className={message ? "font-semibold text-ink" : "text-muted"}>
        {label}
      </span>
      {children}
      {hint && !message && <span className="text-xs text-muted">{hint}</span>}
      {message && <FieldError>{message}</FieldError>}
    </label>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-5 accent-brand"
      />
      {label}
    </label>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <FormNotice tone={state.status === "error" ? "error" : "success"}>
      {state.message}
    </FormNotice>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel = "Saving…",
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? pendingLabel : children}
    </button>
  );
}
