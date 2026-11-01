import type { Metadata } from "next";

import { Logo } from "@/components/site/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="surface-burgundy flex h-16 items-center px-4 sm:px-6">
        <Logo className="h-12 w-auto" />
      </header>
      <div className="m-auto w-full max-w-sm px-4 py-10">
        <p className="text-xs font-semibold tracking-[0.3em] text-brand uppercase">
          Admin
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] font-semibold">
          Sign in
        </h1>
        <div className="mt-8 border-t border-line pt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
