/**
 * Frontend UI components.
 * Owned by: frontend/UI team.
 */
"use client";

import { useState } from "react";
import type { Product } from "@/shared/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [mismatchMessage, setMismatchMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function loadQuote() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quote?productId=${product.id}&quantity=1`);
      const data = await res.json();
      setPrice(data.price?.price ?? null);
      setDelivery(data.price?.estimatedDelivery ?? null);
      setMismatchMessage(data.quantityMismatch?.message ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy() {
    setStatus("Placing order...");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, requestedQuantity: 1 }),
    });
    const data = await res.json();
    setStatus(
      data.status === "confirmed"
        ? `Order confirmed! Arriving ${data.estimatedDelivery}.`
        : "Something went wrong.",
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800">
      <div className="aspect-square w-full rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      <h3 className="text-base font-semibold">{product.name}</h3>

      {price === null ? (
        <button
          onClick={loadQuote}
          disabled={loading}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          {loading ? "Checking price..." : "Check price"}
        </button>
      ) : (
        <>
          <p className="text-2xl font-semibold">${price.toFixed(2)}</p>
          {delivery && (
            <p className="text-sm text-zinc-500">Estimated delivery: {delivery}</p>
          )}
          {mismatchMessage && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {mismatchMessage}
            </p>
          )}
          <button
            onClick={handleBuy}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Buy now
          </button>
        </>
      )}

      {status && <p className="text-sm text-zinc-500">{status}</p>}
    </div>
  );
}
