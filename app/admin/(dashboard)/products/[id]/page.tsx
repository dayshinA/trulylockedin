import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { productRepository } from "@/lib/shop/server";
import {
  dangerButton,
  DangerZone,
  PageHeader,
  textLink,
} from "../../_components/admin-ui";
import { deleteProductAction } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "Edit product",
};

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const repo = productRepository();
  const [product, products] = await Promise.all([repo.get(id), repo.list()]);
  if (!product) notFound();
  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={product.name}
        actions={
          product.published && (
            <Link href={`/shop/${product.id}`} target="_blank" className={textLink}>
              View on site ↗
            </Link>
          )
        }
      />
      <ProductForm product={product} categories={categories} />

      <DangerZone summary="Delete this product">
        <p className="text-muted">
          This removes the product and deletes its photos from storage. To just
          hide it, untick &ldquo;Show on the website&rdquo;; for a short gap,
          untick &ldquo;In stock&rdquo;.
        </p>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" className={dangerButton}>
            Delete permanently
          </button>
        </form>
      </DangerZone>
    </div>
  );
}
