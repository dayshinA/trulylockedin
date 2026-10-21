import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import {
  loadOrderList,
  ORDER_HISTORY_DAYS,
  ORDER_VIEWS,
  type OrderView,
} from "@/lib/shop/orders";
import { orderRepository } from "@/lib/shop/server";
import { PageHeader, Tabs } from "../_components/admin-ui";
import { OrderRows } from "./order-list";

export const metadata: Metadata = {
  title: "Orders",
};

const VIEW_LABELS: Record<OrderView, string> = {
  open: "To prepare / collect",
  collected: "Collected",
  cancelled: "Cancelled",
};

const EMPTY: Record<OrderView, string> = {
  open: "No open orders.",
  collected: `Nothing collected in the last ${ORDER_HISTORY_DAYS} days.`,
  cancelled: `No cancellations in the last ${ORDER_HISTORY_DAYS} days.`,
};

export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  await verifyAdmin();
  const { view: raw } = await searchParams;
  const view: OrderView = ORDER_VIEWS.includes(raw as OrderView)
    ? (raw as OrderView)
    : "open";

  const orders = await loadOrderList(orderRepository(), view, new Date());

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader title="Orders" />
      <Tabs
        label="Filter orders"
        items={ORDER_VIEWS.map((v) => ({
          href: v === "open" ? "/admin/orders" : `/admin/orders?view=${v}`,
          label: VIEW_LABELS[v],
          current: v === view,
        }))}
      />
      <OrderRows orders={orders} empty={EMPTY[view]} />
    </div>
  );
}
