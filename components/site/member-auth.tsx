"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { startMemberSession } from "@/app/(site)/account/actions";
import { clientAuth } from "@/lib/firebase/client";
import {
  memberAuthErrorField,
  memberAuthErrorMessage,
} from "@/lib/members/auth-errors";
import { useErrorFocus } from "@/lib/use-error-focus";
import { memberNameSchema, MIN_PASSWORD_LENGTH } from "@/lib/members/schemas";
import type { MemberProfile } from "@/types/member";
import { Field, FormAlert, inputClass, primaryButtonClass } from "./form-field";
import { GoogleIcon } from "./google-icon";
import { FormNotice } from "@/components/forms/field-error";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

type Mode = "sign-in" | "sign-up" | "reset";

const TITLES: Record<Mode, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create an account",
  reset: "Reset your password",
};

// Member sign-in, sign-up and password reset. Everything happens in this tab
// (the Google window is a popup), so it can sit inside the booking flow
// without losing the chosen service and time. The Firebase client session is
// only used to get an ID token; startMemberSession turns that into the
// httpOnly cookie, then the client signs out again.
export function MemberAuth({
  onSignedIn,
}: {
  onSignedIn?: (member: MemberProfile) => void;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Errors that belong to one field; shown under it, and the form jumps there.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useErrorFocus(formRef, fieldErrors);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setFieldErrors({});
  }

  // A Firebase error goes under its field when it has one.
  function showError(err: unknown) {
    const message = memberAuthErrorMessage(err);
    const field = memberAuthErrorField(err);
    if (message && field) setFieldErrors({ [field]: message });
    else setError(message);
  }

  // Turns a Firebase sign-in into a member session.
  async function finishSignIn(user: User, signUpName?: string) {
    const auth = clientAuth();
    try {
      const result = await startMemberSession(
        await user.getIdToken(),
        signUpName,
      );
      if (result.ok) onSignedIn?.(result.member);
      else setError(result.error);
    } finally {
      await signOut(auth);
    }
  }

  function signInWithGoogle() {
    setError(null);
    setNotice(null);
    // startTransition runs the callback synchronously, so the popup opens
    // inside the click and isn't blocked.
    startTransition(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        const { user } = await signInWithPopup(clientAuth(), provider);
        await finishSignIn(user);
      } catch (err) {
        setError(memberAuthErrorMessage(err));
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setError(null);
    setNotice(null);

    const problems: FieldErrors = {};
    let name: string | undefined;
    if (mode === "sign-up") {
      const parsed = memberNameSchema.safeParse(form.get("name") ?? "");
      if (parsed.success) name = parsed.data;
      else problems.name = parsed.error.issues[0].message;
    }
    if (!email) problems.email = "Enter your email address.";
    if (mode !== "reset" && !password) problems.password = "Enter your password.";
    else if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
      problems.password = `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    if (mode === "reset") {
      startTransition(async () => {
        try {
          await sendPasswordResetEmail(clientAuth(), email, {
            url: `${window.location.origin}/account`,
          });
          // Same reply whether or not the account exists.
          setNotice(
            `If there's an account for ${email}, we've emailed a link to reset your password. Check your spam folder too.`,
          );
        } catch (err) {
          showError(err);
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        const auth = clientAuth();
        const { user } =
          mode === "sign-up"
            ? await createUserWithEmailAndPassword(auth, email, password)
            : await signInWithEmailAndPassword(auth, email, password);
        await finishSignIn(user, name);
      } catch (err) {
        showError(err);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-3xl font-semibold">{TITLES[mode]}</h2>

      {mode !== "reset" && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-field bg-page px-6 font-semibold text-ink transition-colors hover:border-brand disabled:text-muted"
          >
            <GoogleIcon className="size-5" />
            Continue with Google
          </button>
          <p className="flex items-center gap-4 text-xs tracking-widest text-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            or
          </p>
        </>
      )}

      {/* key: each mode gets fresh inputs and the right autocomplete hints. */}
      <form
        key={mode}
        ref={formRef}
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
        noValidate
      >
        {mode === "sign-up" && (
          <Field
            label="Your name"
            error={asList(fieldErrors.name)}
          >
            <input
              name="name"
              autoComplete="name"
              required
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Email" error={asList(fieldErrors.email)}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className={inputClass}
          />
        </Field>
        {mode !== "reset" && (
          <Field
            label="Password"
            hint={
              mode === "sign-up"
                ? `At least ${MIN_PASSWORD_LENGTH} characters`
                : undefined
            }
            error={asList(fieldErrors.password)}
          >
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              minLength={mode === "sign-up" ? MIN_PASSWORD_LENGTH : undefined}
              required
              className={inputClass}
            />
          </Field>
        )}

        {error && <FormAlert>{error}</FormAlert>}
        {notice && <FormNotice tone="success">{notice}</FormNotice>}

        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} sm:w-fit`}
        >
          {pending ? "Please wait…" : SUBMIT_LABELS[mode]}
        </button>
        {mode !== "reset" && (
          <p className="text-xs text-muted">
            We use your details to run your account, bookings and orders. See
            our{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-brand underline decoration-accent underline-offset-4 hover:text-brand-hover"
            >
              privacy notice
            </Link>
            .
          </p>
        )}
      </form>

      <div className="flex flex-col items-start gap-2 text-sm">
        {mode === "sign-in" && (
          <>
            <ModeLink onClick={() => switchMode("reset")}>
              Forgot your password?
            </ModeLink>
            <p className="text-muted">
              New here?{" "}
              <ModeLink onClick={() => switchMode("sign-up")}>
                Create an account
              </ModeLink>
            </p>
          </>
        )}
        {mode !== "sign-in" && (
          <p className="text-muted">
            {mode === "sign-up" ? "Already a member? " : null}
            <ModeLink onClick={() => switchMode("sign-in")}>
              {mode === "sign-up" ? "Sign in" : "Back to sign in"}
            </ModeLink>
          </p>
        )}
      </div>
    </div>
  );
}

const SUBMIT_LABELS: Record<Mode, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  reset: "Send reset link",
};

function ModeLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 text-brand underline underline-offset-4 hover:text-brand-hover"
    >
      {children}
    </button>
  );
}

function asList(message?: string) {
  return message ? [message] : undefined;
}
