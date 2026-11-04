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
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {error?.[0] ? (
        <span className="font-semibold text-brand">{error[0]}</span>
      ) : (
        hint && <span className="text-muted">{hint}</span>
      )}
    </label>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-semibold text-brand">
      {children}
    </p>
  );
}
