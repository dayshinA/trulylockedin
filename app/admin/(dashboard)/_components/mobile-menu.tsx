"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { signOut } from "../actions";
import { ADMIN_NAV, isActive } from "./admin-nav";

// Phone navigation for the dashboard, in the style of the public site's menu:
// a full-screen list under the header. Above md the header's tab row is used.
export function AdminMobileMenu({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center text-cream"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span aria-hidden className="relative block h-3 w-6">
          <span
            className={`absolute left-0 h-px w-6 bg-current transition-transform duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`}
          />
          <span
            className={`absolute left-0 h-px w-6 bg-current transition-transform duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
          />
        </span>
      </button>

      {/* Portalled to <body>; z-25 keeps it under the sticky header (z-30),
          which holds the close button. */}
      {open &&
        createPortal(
          <div
            id={menuId}
            className="fixed inset-0 z-[25] flex flex-col overflow-y-auto bg-espresso px-6 pt-24 pb-4 md:hidden"
          >
            <MobileNavItems firstLink={firstLink} onNavigate={close} />
            <div className="mt-auto flex items-center gap-4 border-t border-brown pt-3 text-xs">
              <p className="min-w-0 flex-1 truncate text-sand">{email}</p>
              <Link
                href="/"
                target="_blank"
                onClick={close}
                className="inline-flex min-h-11 shrink-0 items-center text-sand transition-colors hover:text-cream"
              >
                View site ↗
              </Link>
              <form action={signOut} className="shrink-0">
                <button
                  type="submit"
                  className="min-h-11 font-semibold text-gold transition-colors hover:text-gold-light"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// Only rendered while the menu is open (client-side), so usePathname never
// suspends here.
function MobileNavItems({
  firstLink,
  onNavigate,
}: {
  firstLink: React.RefObject<HTMLAnchorElement | null>;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col">
      {ADMIN_NAV.map(({ href, label }, i) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            ref={i === 0 ? firstLink : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`font-display text-4xl leading-tight transition-colors hover:text-gold ${
              active ? "text-gold" : "text-cream"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
