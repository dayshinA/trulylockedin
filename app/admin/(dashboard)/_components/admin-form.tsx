"use client";

import { startTransition, useActionState } from "react";

import { primaryButton } from "./admin-ui";
import { IDLE, type FormState } from "./form-state";

export const inputClass =
  "min-h-12 w-full rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand";

// Submits through onSubmit rather than <form action>, so React doesn't reset
// the fields after a failed save and the owner keeps what they typed.
export function useAdminForm(
  action: (previous: FormState, formData: FormData) => Promise<FormState>,
) {
  const [state, dispatch, pending] = useActionState(action, IDLE);
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
  return (
    <label className={`flex flex-col gap-2 text-sm ${className}`}>
      <span className="text-muted">{label}</span>
      {children}
      {hint && !error?.[0] && <span className="text-xs text-muted">{hint}</span>}
      {error?.[0] && <span className="font-semibold text-brand">{error[0]}</span>}
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
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "text-sm font-semibold text-brand"
          : "text-sm text-brand"
      }
    >
      {state.message}
    </p>
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
