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
import { PageGuide } from "../_components/help";

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

      <PageGuide
        id="products"
      >
          <li>
            These are the products in your website <strong>Shop</strong>.
            Customers add them to a basket and either collect from the salon or
            have them posted. New orders appear under <strong>Orders</strong>.
          </li>
          <li>
            Tap <strong>Add product</strong>, add a name, price and at least
            one photo, then save. It&rsquo;s in the shop straight away.
          </li>
          <li>
            Run out of something? Open it and untick{" "}
            <strong>In stock</strong>. It stays visible as &ldquo;Sold
            out&rdquo; so nobody can order it, and you don&rsquo;t lose the
            details.
          </li>
          <li>
            Sell more than one size? Add each size as its own product.
          </li>
      </PageGuide>

      {products.length === 0 ? (
        <p className="text-muted">
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
                    <span className="size-16 shrink-0 rounded-sm bg-surface" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={rowTitle}>{product.name}</span>
                    <span className="block truncate text-sm text-muted">
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
