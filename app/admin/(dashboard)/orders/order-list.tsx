import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { ORDER_ADMIN_LABELS, itemCount } from "@/lib/shop/orders";
import type { Order, OrderStatus } from "@/types/shop";
import {
  Badge,
  type BadgeTone,
  rowLink,
  rowList,
  rowTitle,
} from "../_components/admin-ui";

const TONE: Record<OrderStatus, BadgeTone> = {
  pending: "attention",
  ready: "accent",
  collected: "muted",
  cancelled: "struck",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{ORDER_ADMIN_LABELS[status]}</Badge>;
}

const placedAt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/London",
});

export function OrderRows({
  orders,
  empty,
}: {
  orders: Order[];
  empty: string;
}) {
  if (orders.length === 0) return <p className="text-sand">{empty}</p>;
  return (
    <ul className={rowList}>
      {orders.map((order) => {
        const count = itemCount(order.items);
        return (
          <li key={order.id}>
            <Link href={`/admin/orders/${order.id}`} className={rowLink}>
              <span className="min-w-0 flex-1">
                <span className={rowTitle}>{order.client.name}</span>
                <span className="block truncate text-sm text-sand">
                  {count} {count === 1 ? "item" : "items"} ·{" "}
                  {formatPrice(order.totalPence)} ·{" "}
                  {placedAt.format(new Date(order.createdAt))}
                </span>
              </span>
              <OrderStatusBadge status={order.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
