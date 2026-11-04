"use client";

import { useState, useTransition } from "react";

import { signOutMember } from "@/app/(site)/account/actions";
import type { MemberProfile } from "@/types/member";
import { MemberAuth } from "./member-auth";

const linkButton =
  "text-brand underline underline-offset-4 hover:text-brand-hover disabled:text-muted";

const WORDING = {
  booking: { acting: "Booking as", keep: "keep your bookings together" },
  order: { acting: "Ordering as", keep: "keep your orders together" },
} as const;

// Sits above a details form (booking, shop checkout). Guests carry on as
// before. Signing in happens inline, so the page's state (chosen time,
// basket) is kept; the member comes back through the page's props once the
// session action refreshes the route.
export function MemberBar({
  member,
  purpose,
}: {
  member: MemberProfile | null;
  purpose: keyof typeof WORDING;
}) {
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const wording = WORDING[purpose];

  if (member) {
    return (
      <p className="border-l-2 border-brand pl-4 text-ink">
        {wording.acting} <span className="font-semibold">{member.name}</span>.{" "}
        <span className="text-muted">Not you?</span>{" "}
        <button
          type="button"
          disabled={signingOut}
          onClick={() => startSignOut(() => signOutMember())}
          className={linkButton}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </p>
    );
  }

  if (!signingIn) {
    return (
      <p className="border-l-2 border-line pl-4 text-muted">
        Have an account?{" "}
        <button
          type="button"
          onClick={() => setSigningIn(true)}
          className={linkButton}
        >
          Sign in
        </button>{" "}
        to fill this in and {wording.keep}. Or just carry on as a guest.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-line p-5 sm:p-6">
      <MemberAuth onSignedIn={() => setSigningIn(false)} />
      <button
        type="button"
        onClick={() => setSigningIn(false)}
        className={`${linkButton} min-h-11 w-fit text-sm`}
      >
        Continue as a guest instead
      </button>
    </div>
  );
}
