import Link from "next/link";
import { Suspense } from "react";

import { SITE_NAME } from "@/lib/site";
import { BasketLink } from "./basket-link";
import { CurrentNavItems, HeaderFrame, NavItems } from "./header-nav";
import { LogoMark } from "./logo";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  return (
    <HeaderFrame>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="relative z-50 flex items-center gap-3 text-cream"
        >
          <LogoMark className="size-10" />
          <span className="font-wordmark text-3xl leading-none font-bold tracking-wide text-marigold uppercase">
            {SITE_NAME}
          </span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <Suspense fallback={<NavItems pathname={null} />}>
            <CurrentNavItems />
          </Suspense>
          <BasketLink />
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-semibold text-espresso transition-colors hover:bg-gold-light"
          >
            Book now
          </Link>
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <BasketLink />
          <MobileMenu />
        </div>
      </div>
    </HeaderFrame>
  );
}
