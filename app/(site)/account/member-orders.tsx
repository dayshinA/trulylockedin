import { formatLocalDate, formatPrice } from "@/lib/format";
import { localDateOf } from "@/lib/members/dates";
import type { MemberOrder } from "@/lib/shop/member-orders";
import {
  fulfilmentLabel,
  itemCount,
  orderStatusLabel,
  paymentLabel,
  refundablePence,
} from "@/lib/shop/orders";
import { CancelButton } from "./cancel-button";
import { OrderAgain } from "./order-again";

export function OrderRow({
  order,
  orderAgain = false,
}: {
  order: MemberOrder;
  orderAgain?: boolean;
}) {
  const missing = itemCount(order.items) - itemCount(order.reorder);
  return (
    <li className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold text-ink">
          Ordered {formatLocalDate(localDateOf(order.createdAt), "long")}
        </p>
        <p className="text-sm text-muted">
          {orderStatusLabel(order)}
        </p>
      </div>
      <div className="text-muted">
        <p>
          {order.items
            .map((item) => `${item.quantity} × ${item.name}`)
            .join(", ")}
        </p>
        <p className="text-sm">
          Total{" "}
          <span className="text-accent-ink">
            {formatPrice(order.totalPence)}
          </span>{" "}
          · Ref <span className="font-mono">{order.ref}</span>
        </p>
        <p className="text-sm">
          {order.delivery
            ? `Delivery to ${order.delivery.postcode}`
            : fulfilmentLabel(order)}{" "}
          · {paymentLabel(order)}
        </p>
      </div>
      {order.canCancel && (
        <CancelButton
          kind="order"
          id={order.id}
          warning={
            refundablePence(order) > 0
              ? `We'll refund ${formatPrice(refundablePence(order))} to your card.`
              : undefined
          }
        />
      )}
      {orderAgain && order.reorder.length > 0 && (
        <div className="flex flex-col gap-1">
          <OrderAgain lines={order.reorder} />
          {missing > 0 && (
            <p className="text-sm text-muted">
              {missing} {missing === 1 ? "item isn't" : "items aren't"}{" "}
              available any more and won&rsquo;t be added.
            </p>
          )}
        </div>
      )}
    </li>
  );
}
