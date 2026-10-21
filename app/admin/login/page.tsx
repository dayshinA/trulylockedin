import type { Metadata } from "next";

import { LogoMark } from "@/components/site/logo";
import { SITE_NAME } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 font-display text-2xl font-semibold tracking-wide">
          <LogoMark className="size-10" />
          {SITE_NAME}
        </div>
        <p className="mt-10 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
          Admin
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] font-semibold">
          Sign in
        </h1>
        <div className="mt-8 border-t border-brown pt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
