import Link from "next/link";

import { FieldError } from "@/components/forms/field-error";

const link =
  "font-semibold text-brand underline decoration-accent underline-offset-4 hover:text-brand-hover";

// The "I agree" box on the booking form and at checkout. The server refuses
// the request unless it's ticked (acceptTerms in lib/booking/request.ts).
// Links open in a new tab so the form keeps what's been typed.
export function TermsConsent({
  error,
  children,
}: {
  error?: string[];
  // What the terms cover for this form, e.g. the deposit rule.
  children?: React.ReactNode;
}) {
  return (
    <div
      data-invalid={error?.[0] ? "" : undefined}
      className="flex flex-col gap-2"
    >
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5 size-5 shrink-0 accent-brand"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className={link}>
            terms
          </Link>
          {children} and have read the{" "}
          <Link href="/privacy" target="_blank" className={link}>
            privacy notice
          </Link>
          .
        </span>
      </label>
      {error?.[0] && <FieldError>{error[0]}</FieldError>}
    </div>
  );
}
