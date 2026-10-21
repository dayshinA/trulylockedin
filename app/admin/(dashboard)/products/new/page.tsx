import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { productRepository } from "@/lib/shop/server";
import { PageHeader } from "../../_components/admin-ui";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Add product",
};

export default async function NewProductPage() {
  await verifyAdmin();
  const products = await productRepository().list();
  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title="Add product"
      />
      <ProductForm categories={categories} />
    </div>
  );
}
