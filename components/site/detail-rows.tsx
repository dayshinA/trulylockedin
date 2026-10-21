// Label/value rows split by hairlines (booking and order confirmations).
export function DetailRows({
  rows,
}: {
  rows: [label: string, value: React.ReactNode][];
}) {
  return (
    <dl className="border-t border-brown">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[7rem_1fr] gap-4 border-b border-brown py-4 sm:grid-cols-[9rem_1fr]"
        >
          <dt className="text-sand">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
