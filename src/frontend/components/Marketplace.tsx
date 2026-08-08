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

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Marketplace</h1>
      <p className="mb-10 text-zinc-500">
        Pick a product — we&apos;ve already found the best price for you.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
