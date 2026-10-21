import type { Metadata } from "next";
import Link from "next/link";

import { CldImage } from "@/components/media/cld";
import { verifyAdmin } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format";
import { coverOf } from "@/lib/portfolio/media";
import { productRepository } from "@/lib/shop/server";
import {
  Badge,
  PageHeader,
  primaryButton,
  rowLink,
  rowList,
  rowTitle,
} from "../_components/admin-ui";

export const metadata: Metadata = {
  title: "Products",
};

export default async function ProductsAdminPage() {
  await verifyAdmin();
  const products = await productRepository().list();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Products"
        actions={
          <Link href="/admin/products/new" className={primaryButton}>
            Add product
          </Link>
        }
      />

      {products.length === 0 ? (
        <p className="text-sand">
          No products yet. Add your first one to open the Shop page.
        </p>
      ) : (
        <ul className={rowList}>
          {products.map((product) => {
            const cover = coverOf(product);
            return (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}`}
                  className={rowLink}
                >
                  {cover ? (
                    <CldImage
                      src={cover.publicId}
                      width={64}
                      height={64}
                      crop="fill"
                      alt=""
                      className="size-16 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="size-16 shrink-0 rounded-sm bg-cocoa" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={rowTitle}>{product.name}</span>
                    <span className="block truncate text-sm text-sand">
                      {formatPrice(product.pricePence)}
                      {product.category && ` · ${product.category}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {!product.published && <Badge tone="muted">Hidden</Badge>}
                    {!product.inStock && (
                      <Badge tone="muted">Out of stock</Badge>
                    )}
                    {product.featured && (
                      <Badge tone="accent">Featured</Badge>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
