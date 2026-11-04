import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireMember } from "@/lib/auth/member-dal";
import { SignOutButton } from "../sign-out-button";
import { DeleteAccount } from "./delete-account";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false, follow: false },
};

export default function AccountDetailsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <Link
        href="/account"
        className="mb-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Your account
      </Link>
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Your details
      </h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <DetailsLoader />
      </Suspense>
    </main>
  );
}

async function DetailsLoader() {
  const member = await requireMember();
  return (
    <div className="mt-8 flex flex-col gap-12">
      <ProfileForm
        name={member.name}
        email={member.email}
        phone={member.phone}
      />
      <div className="border-t border-line pt-6">
        <SignOutButton />
      </div>
      <DeleteAccount />
    </div>
  );
}
