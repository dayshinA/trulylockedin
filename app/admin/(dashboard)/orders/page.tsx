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
import { PageGuide } from "../_components/help";
import { OrderRows } from "./order-list";

export const metadata: Metadata = {
  title: "Orders",
};

const VIEW_LABELS: Record<OrderView, string> = {
  open: "Open",
  collected: "Completed",
  cancelled: "Cancelled",
};

const EMPTY: Record<OrderView, string> = {
  open: "No open orders.",
  collected: `Nothing collected or delivered in the last ${ORDER_HISTORY_DAYS} days.`,
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
      <PageGuide
        id="orders"
      >
          <li>
            Orders from your website shop land here, and you get an email for
            each one. <strong>Open</strong> is everything you still need to
            pack, post or hand over.
          </li>
          <li>
            Each order says whether the customer will <strong>collect</strong>{" "}
            it from the salon or wants it <strong>delivered</strong> (free, UK
            only), and whether they&rsquo;ve <strong>paid online</strong> or
            will pay when they collect.
          </li>
          <li>
            Open an order to see what to pack, then tap{" "}
            <strong>Mark ready to collect</strong> or <strong>Mark posted</strong>. The
            customer is emailed automatically.
          </li>
          <li>
            <strong>Completed</strong> shows orders collected or delivered in
            the last {ORDER_HISTORY_DAYS} days. <strong>Cancelled</strong>{" "}
            shows ones that were cancelled, by you or the customer.
          </li>
          <li>
            Customers can cancel online themselves only until you mark the
            order ready. Money paid online is refunded to their card whenever
            an order is cancelled.
          </li>
      </PageGuide>
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
