import Link from "next/link";

import { Logo } from "./logo";

export type StatusAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

// Full-height burgundy panel for the 404 and error pages. Works inside the
// site layout (under the fixed header) and on its own (`standalone` shows the
// logo, since there's no header then). Usable from Client Components too.
export function StatusPage({
  code,
  title,
  text,
  actions,
  standalone = false,
}: {
  code?: string;
  title: string;
  text: string;
  actions: StatusAction[];
  standalone?: boolean;
}) {
  return (
    <main
      className={`surface-burgundy flex flex-1 items-center bg-page px-4 text-ink sm:px-6 ${
        standalone ? "min-h-svh py-16" : "min-h-[80svh] pt-32 pb-20"
      }`}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {standalone && (
          <Link href="/" aria-label="Home" className="mb-12">
            <Logo className="h-auto w-36" sizes="144px" />
          </Link>
        )}
        {code && (
          <p
            aria-hidden
            className="font-display text-8xl leading-none font-semibold text-accent sm:text-9xl"
          >
            {code}
          </p>
        )}
        <span aria-hidden className="my-6 h-0.5 w-12 bg-accent" />
        <h1 className="font-display text-4xl font-semibold sm:text-6xl">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-muted">{text}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {actions.map((action, i) => {
            const className = `inline-flex min-h-12 items-center rounded-full px-8 text-sm font-semibold tracking-widest uppercase transition-colors ${
              i === 0
                ? "bg-accent text-on-accent hover:bg-accent-hover"
                : "border border-line text-ink hover:border-ink"
            }`;
            return "href" in action ? (
              <Link key={action.label} href={action.href} className={className}>
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
