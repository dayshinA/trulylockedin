import Link from "next/link";
import { Suspense } from "react";

import { AccountLink } from "./account-link";
import { BasketLink } from "./basket-link";
import { CurrentNavItems, NavItems } from "./header-nav";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  return (
    <header className="surface-burgundy fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="relative z-50 shrink-0">
          <Logo className="h-12 w-auto" />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <Suspense fallback={<NavItems pathname={null} />}>
            <CurrentNavItems />
          </Suspense>
          <div className="-mx-3 flex items-center">
            <AccountLink />
            <BasketLink />
          </div>
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Book now
          </Link>
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <AccountLink />
          <BasketLink />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
