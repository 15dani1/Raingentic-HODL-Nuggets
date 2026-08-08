/**
 * Frontend UI components.
 * Owned by: frontend/UI team.
 */
"use client";

import { useEffect, useState } from "react";
import type { CheckoutResult, Product, QuantityMismatchPrompt } from "@/shared/types";

interface ProductCardProps {
  product: Product;
}

async function submitCheckout(
  productId: string,
  acceptedPackQuantity?: boolean,
): Promise<CheckoutResult> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      requestedQuantity: 1,
      ...(acceptedPackQuantity === undefined ? {} : { acceptedPackQuantity }),
    }),
  });
  return res.json();
}

export function ProductCard({ product }: ProductCardProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [buying, setBuying] = useState(false);
  const [mismatch, setMismatch] = useState<QuantityMismatchPrompt | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/quote?productId=${product.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPrice(data.price?.price ?? null);
        setDelivery(data.price?.estimatedDelivery ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrice(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  async function handleBuy() {
    setBuying(true);
    setStatus("Finding the best price...");
    const result = await submitCheckout(product.id);

    if (result.status === "needs_confirmation" && result.quantityMismatch) {
      setMismatch(result.quantityMismatch);
      setStatus(null);
      setBuying(false);
      return;
    }

    finishOrder(result);
  }

  async function respondToMismatch(accept: boolean) {
    setBuying(true);
    setStatus(accept ? "Buying the pack..." : "Buying a single unit...");
    const result = await submitCheckout(product.id, accept);
    setMismatch(null);
    finishOrder(result);
  }

  function finishOrder(result: CheckoutResult) {
    setStatus(
      result.status === "confirmed"
        ? `Order confirmed! Arriving ${result.estimatedDelivery}.`
        : "Something went wrong.",
    );
    setBuying(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={product.name}
        className="aspect-square w-full rounded-xl bg-zinc-100 object-cover dark:bg-zinc-900"
      />
      <h3 className="text-base font-semibold">{product.name}</h3>

      {loadingPrice ? (
        <p className="text-sm text-zinc-400">Loading price...</p>
      ) : price === null ? (
        <p className="text-sm text-zinc-400">Price unavailable</p>
      ) : (
        <>
          <p className="text-2xl font-semibold">${price.toFixed(2)}</p>
          {delivery && (
            <p className="text-sm text-zinc-500">Estimated delivery: {delivery}</p>
          )}
        </>
      )}

      {mismatch && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-2">{mismatch.message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => respondToMismatch(true)}
              disabled={buying}
              className="rounded-full bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950"
            >
              Buy the pack
            </button>
            <button
              onClick={() => respondToMismatch(false)}
              disabled={buying}
              className="rounded-full border border-amber-800 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50 dark:border-amber-200 dark:hover:bg-amber-900"
            >
              No, just 1
            </button>
          </div>
        </div>
      )}

      {!mismatch && (
        <button
          onClick={handleBuy}
          disabled={buying || price === null}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {buying ? "Working..." : "Buy now"}
        </button>
      )}

      {status && <p className="text-sm text-zinc-500">{status}</p>}
    </div>
  );
}
