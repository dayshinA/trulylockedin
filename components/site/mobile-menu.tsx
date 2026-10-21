"use client";

import { useLenis } from "lenis/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isActivePath, NAV_LINKS } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const lenis = useLenis();
  const menuId = useId();
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, lenis]);

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

      {/* Portalled to <body> so it can sit outside the header's stacking
          context: z-25 keeps it under the header (logo + close button) and
          over the mobile Book bar. */}
      {open &&
        createPortal(
          <div
            id={menuId}
            className="fixed inset-0 z-[25] flex flex-col bg-espresso px-6 pt-28 pb-10 md:hidden"
          >
            <MobileNavItems firstLink={firstLink} onNavigate={close} />
            <Link
              href="/book"
              onClick={close}
              className="mt-auto inline-flex min-h-12 items-center justify-center rounded-full bg-gold text-sm font-semibold tracking-widest text-espresso uppercase"
            >
              Book an appointment
            </Link>
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
    <nav aria-label="Main" className="flex flex-col gap-2">
      {NAV_LINKS.map(({ href, label }, i) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            ref={i === 0 ? firstLink : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`font-display text-5xl leading-tight transition-colors hover:text-gold ${
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
