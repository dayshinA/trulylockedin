import { FieldError, FormNotice } from "@/components/forms/field-error";

// Shared by the public forms (booking details, member sign-in, account details).
export const inputClass =
  "min-h-12 w-full rounded-sm border border-field bg-page px-3 text-base text-ink outline-none focus:border-brand";

export const primaryButtonClass =
  "min-h-12 rounded-full bg-brand px-10 font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-muted";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  const message = error?.[0];
  return (
    <label
      data-invalid={message ? "" : undefined}
      className="flex flex-col gap-2 text-sm"
    >
      <span className={message ? "font-semibold text-ink" : "text-muted"}>
        {label}
      </span>
      {children}
      {message ? (
        <FieldError>{message}</FieldError>
      ) : (
        hint && <span className="text-muted">{hint}</span>
      )}
    </label>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return <FormNotice>{children}</FormNotice>;
}
