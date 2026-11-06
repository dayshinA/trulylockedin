import { Fragment } from "react";

// Words between *stars* render in orange: "*Care* first, then *craft*".
// Only for big display headings (the colour is AA for large text only). An
// unpaired star is shown as typed.
export function Highlight({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-highlight">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

