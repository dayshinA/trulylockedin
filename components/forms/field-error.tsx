import { CircleAlert, CircleCheck } from "lucide-react";

// Shared by the public site and the admin. A field's error line: an icon plus
// the message. `data-field-error` is what useErrorFocus looks for to move the
// user to the first problem after a failed submit.
// `live` announces it as soon as it appears, for errors shown without a
// submit (e.g. a photo that's too big); submit errors are announced by the
// form's FormNotice instead.
export function FieldError({
  children,
  live = false,
  className = "",
}: {
  children: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      data-field-error
      role={live ? "alert" : undefined}
      className={`flex items-start gap-1.5 text-sm font-semibold text-brand ${className}`}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </span>
  );
}

// The form-level message by the submit button ("Please check the highlighted
// fields."). Errors get a tinted box with a left rule; success is plain.
export function FormNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
}) {
  if (tone === "success") {
    return (
      <p role="status" className="flex items-start gap-2 text-sm font-semibold text-brand">
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{children}</span>
      </p>
    );
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-sm border-l-4 border-brand bg-brand/5 px-3 py-2.5 text-sm font-semibold text-brand"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
