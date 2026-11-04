// A titled list on /account (appointments, orders), or a short empty note.
export function AccountSection({
  title,
  isEmpty,
  empty,
  children,
}: {
  title: string;
  isEmpty: boolean;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = `account-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="font-display text-3xl font-semibold">
        {title}
      </h2>
      {isEmpty ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {children}
        </ul>
      )}
    </section>
  );
}
