"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sticky mobile call to action; hidden where it would be redundant, or would
// sit right under the page's own main button (Sign in, Add to basket) and look
// like a second one.
export function BookBar() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/book") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/shop/")
  ) {
    return null;
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-page p-3 md:hidden">
      <Link
        href="/book"
        className="flex min-h-12 items-center justify-center rounded-full bg-brand text-sm font-semibold tracking-widest text-on-brand uppercase"
      >
        Book now
      </Link>
    </div>
  );
}
