/**
 * Frontend UI component: marketplace grid (client-facing storefront).
 * Owned by: frontend/UI team.
 */
"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/shared/types";
import { ProductCard } from "@/frontend/components/ProductCard";

export function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
        <p className="mt-2 max-w-xl text-zinc-500">
          Every price already reflects the cheapest retailer and shipping option we
          found for you. Just click Buy now.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
