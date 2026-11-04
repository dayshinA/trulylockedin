// The owner's ordering/collection notes as a numbered list between hairlines.
export function ShopNotes({
  notes,
  columns = false,
}: {
  notes: string[];
  // Two columns from the sm breakpoint (the /shop page).
  columns?: boolean;
}) {
  if (notes.length === 0) return null;
  return (
    <ol
      className={`grid border-y border-line ${columns ? "sm:grid-cols-2 sm:gap-x-12" : ""}`}
    >
      {notes.map((note, i) => (
        <li
          key={note}
          className={`flex gap-4 border-b border-line py-4 last:border-b-0 ${columns ? "sm:border-b-0" : ""}`}
        >
          <span className="font-display text-xl text-accent">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="pt-0.5 text-muted">{note}</span>
        </li>
      ))}
    </ol>
  );
}
