import { Fragment } from "react";

import { linkify, parseLegalText } from "@/lib/content/legal-text";

const linkClass =
  "font-semibold text-brand underline decoration-accent underline-offset-4 break-words hover:text-brand-hover";

function Line({ text }: { text: string }) {
  return linkify(text).map((span, i) =>
    span.kind === "text" ? (
      <Fragment key={i}>{span.text}</Fragment>
    ) : (
      <a
        key={i}
        href={span.href}
        className={linkClass}
        {...(span.href.startsWith("https://")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {span.text}
      </a>
    ),
  );
}

// Renders the owner's legal text (see lib/content/legal-text.ts).
export function LegalText({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed text-muted">
      {parseLegalText(body).map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h2
              key={i}
              className="mt-8 font-display text-3xl font-semibold text-ink first:mt-0"
            >
              {block.text}
            </h2>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={i} className="flex flex-col gap-2 pl-5">
              {block.items.map((item, j) => (
                <li key={j} className="list-disc marker:text-accent">
                  <Line text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Line text={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
