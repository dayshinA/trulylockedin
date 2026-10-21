import { formatPrice } from "@/lib/format";
import type { OrderItem } from "@/types/shop";

// An order's item lines and total, between hairlines.
export function OrderLines({
  items,
  totalLabel,
  totalPence,
}: {
  items: OrderItem[];
  totalLabel: string;
  totalPence: number;
}) {
  return (
    <ul className="border-t border-brown">
      {items.map((item) => (
        <li
          key={item.productId}
          className="flex justify-between gap-4 border-b border-brown py-4"
        >
          <span>
            {item.quantity} × {item.name}
          </span>
          <span className="shrink-0">
            {formatPrice(item.pricePence * item.quantity)}
          </span>
        </li>
      ))}
      <li className="flex justify-between gap-4 border-b border-brown py-4 text-lg">
        <span>{totalLabel}</span>
        <span className="shrink-0 font-semibold text-gold">
          {formatPrice(totalPence)}
        </span>
      </li>
    </ul>
  );
}
