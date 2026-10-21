import Image from "next/image";

import logo from "@/public/brand/logo.jpg";
import logoMark from "@/public/brand/logo-mark.jpg";

// The head-only crop: the full logo's wordmark is unreadable at header size.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src={logoMark}
      alt=""
      sizes="48px"
      loading="eager"
      className={`rounded-lg ${className}`}
    />
  );
}

export function LogoFull({ className = "" }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="TrulyLockedIn — Retwist & Styled"
      sizes="(min-width: 768px) 224px, 192px"
      className={`rounded-2xl ${className}`}
    />
  );
}
