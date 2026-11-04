import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";

import { Logo } from "@/components/site/logo";
import { verifyAdmin } from "@/lib/auth/dal";
import { maybeCleanUpReferencePhotos } from "@/lib/booking/reference-cleanup";
import { AdminNavItems, CurrentAdminNavItems } from "./_components/admin-nav";
import { AdminMobileMenu } from "./_components/mobile-menu";
import { signOut } from "./actions";

// The session read is request-time, so the gate streams in behind Suspense
// (Cache Components) and the static chrome stays in the prerendered shell.
export default function DashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="surface-burgundy sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link
              href="/admin"
              className="flex min-w-0 items-center gap-3"
            >
              <Logo className="h-12 w-auto shrink-0" />
              <span className="hidden font-sans text-xs font-semibold tracking-[0.3em] text-brand uppercase sm:inline">
                Admin
              </span>
            </Link>
            <Suspense fallback={<AdminMobileMenu />}>
              <AccountMenu />
            </Suspense>
          </div>
          <nav aria-label="Admin" className="hidden gap-7 md:flex">
            <Suspense fallback={<AdminNavItems pathname={null} />}>
              <CurrentAdminNavItems />
            </Suspense>
          </nav>
        </div>
      </header>
      <Suspense
        fallback={
          <p className="mx-auto w-full max-w-6xl px-4 py-10 text-muted sm:px-6">
            Loading…
          </p>
        }
      >
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await verifyAdmin();
  // Background housekeeping while the owner is here (throttled).
  after(maybeCleanUpReferencePhotos);
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      {children}
    </main>
  );
}

async function AccountMenu() {
  const admin = await verifyAdmin();
  return (
    <div className="flex shrink-0 items-center gap-4 text-sm">
      <AdminMobileMenu email={admin.email} />
      <Link
        href="/"
        target="_blank"
        className="hidden text-muted transition-colors hover:text-ink md:inline"
      >
        View site ↗
      </Link>
      <span className="hidden max-w-48 truncate text-muted lg:inline">
        {admin.email}
      </span>
      <form action={signOut} className="hidden md:block">
        <button
          type="submit"
          className="min-h-11 rounded-full border border-brand px-4 text-ink transition-colors hover:border-brand hover:text-brand-hover"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
