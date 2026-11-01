import { SplitHeading } from "@/components/motion/split-heading";

// Shared top section for inner pages (sits below the fixed header).
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="px-4 pt-32 pb-12 sm:px-6 sm:pt-40 sm:pb-16">
      <div className="mx-auto max-w-6xl">
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-brand uppercase">
            {eyebrow}
          </p>
        )}
        <SplitHeading
          as="h1"
          className="max-w-3xl font-display text-5xl leading-[1.05] font-semibold sm:text-7xl"
        >
          {title}
        </SplitHeading>
        {children && (
          <div className="mt-6 max-w-xl text-lg text-muted">{children}</div>
        )}
      </div>
    </section>
  );
}
