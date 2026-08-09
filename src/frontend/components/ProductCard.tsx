/**
 * Frontend UI components.
 * Owned by: frontend/UI team.
 */
"use client";

import { useEffect, useRef, useState } from "react";
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

// Narrates what the agent is doing in real time, purely for demo purposes —
// these steps mirror the real backend flow in /api/checkout (arbitrage
// search -> Monad spend-policy check -> Rain scoped card -> authorize ->
// settle), staged with short delays so a human audience can follow along.
const DEMO_STEPS = [
  { label: "Searching every retailer & pack size", ms: 500 },
  { label: "Checking Monad testnet is live", ms: 550 },
  { label: "Issuing a scoped Rain card", ms: 650 },
  { label: "Authorizing the charge", ms: 500 },
  { label: "Settling the transaction", ms: 500 },
];

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-emerald-500">
        <circle cx="8" cy="8" r="8" className="fill-current opacity-15" />
        <path
          d="M4.5 8.2l2.2 2.2 4.8-4.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (state === "active") {
    return (
      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <span className="absolute h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
        <span className="relative h-2 w-2 rounded-full bg-sky-500" />
      </span>
    );
  }
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />;
}

export function ProductCard({ product }: ProductCardProps) {
  const [price, setPrice] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [buying, setBuying] = useState(false);
  const [mismatch, setMismatch] = useState<QuantityMismatchPrompt | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [order, setOrder] = useState<CheckoutResult | null>(null);
  const cancelledRef = useRef(false);

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

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  /** Steps through DEMO_STEPS while the real checkout request runs in parallel. */
  async function playDemoSteps() {
    for (let i = 0; i < DEMO_STEPS.length; i++) {
      if (cancelledRef.current) return;
      setStepIndex(i);
      // Yield to the browser so it actually paints the "active" step before
      // moving on to the next one.
      await new Promise((resolve) => setTimeout(resolve, DEMO_STEPS[i].ms));
      if (cancelledRef.current) return;
    }
    // Hold on the last step briefly so it's visibly reached, rather than
    // jumping straight from step 1 to "confirmed".
    setStepIndex(DEMO_STEPS.length - 1);
  }

  async function handleBuy() {
    setBuying(true);
    setOrder(null);
    setStatus(null);
    setStepIndex(0);

    const [result] = await Promise.all([submitCheckout(product.id), playDemoSteps()]);

    if (result.status === "needs_confirmation" && result.quantityMismatch) {
      setMismatch(result.quantityMismatch);
      setStepIndex(-1);
      setBuying(false);
      return;
    }

    finishOrder(result);
  }

  async function respondToMismatch(accept: boolean) {
    setBuying(true);
    setMismatch(null);
    setStepIndex(0);

    const [result] = await Promise.all([
      submitCheckout(product.id, accept),
      playDemoSteps(),
    ]);
    finishOrder(result);
  }

  function finishOrder(result: CheckoutResult) {
    setStepIndex(-1);
    setOrder(result);
    setStatus(
      result.status === "confirmed"
        ? `Confirmed — arriving ${result.estimatedDelivery}`
        : "Something went wrong. Please try again.",
    );
    setBuying(false);
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="aspect-square w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {product.name}
        </h3>

        <div className="flex items-baseline justify-between">
          {loadingPrice ? (
            <div className="h-7 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          ) : price === null ? (
            <p className="text-sm text-zinc-400">Price unavailable</p>
          ) : (
            <p className="text-2xl font-semibold tracking-tight">${price.toFixed(2)}</p>
          )}
          {delivery && !loadingPrice && (
            <p className="text-xs text-zinc-400">Arrives {delivery}</p>
          )}
        </div>

        {mismatch && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-200">
            <p className="mb-2 leading-relaxed">{mismatch.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => respondToMismatch(true)}
                disabled={buying}
                className="rounded-full bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950"
              >
                Buy the pack
              </button>
              <button
                onClick={() => respondToMismatch(false)}
                disabled={buying}
                className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:hover:bg-amber-900/40"
              >
                Just 1
              </button>
            </div>
          </div>
        )}

        {!mismatch && (
          <button
            onClick={handleBuy}
            disabled={buying || price === null}
            className="mt-auto rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {buying ? "Processing…" : "Buy now"}
          </button>
        )}

        {stepIndex >= 0 && (
          <ul className="flex flex-col gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            {DEMO_STEPS.map((step, i) => (
              <li key={step.label} className="flex items-center gap-2">
                <StepIcon state={i < stepIndex ? "done" : i === stepIndex ? "active" : "pending"} />
                <span className={i === stepIndex ? "text-zinc-700 dark:text-zinc-200" : ""}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        {status && (
          <p
            className={
              "text-xs " +
              (order?.status === "confirmed"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500")
            }
          >
            {status}
          </p>
        )}

        {order?.status === "confirmed" && (
          <a
            href="/dev"
            className="text-xs font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            View this order in the dev dashboard →
          </a>
        )}
      </div>
    </div>
  );
}
