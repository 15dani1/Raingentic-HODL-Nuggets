/**
 * Frontend UI component: internal retailer/shipping dashboard.
 * Owned by: frontend/UI team.
 */
"use client";

import { useEffect, useState } from "react";
import type { LandedCostQuote, Product } from "@/shared/types";

interface DashboardRow {
  product: Product;
  quotes: LandedCostQuote[];
}

export function Dashboard() {
  const [rows, setRows] = useState<DashboardRow[]>([]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => setRows(data.data ?? []));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Retailer Dashboard</h1>
      <p className="mb-10 text-zinc-500">
        Internal view of mocked retailer pricing and shipping costs per product.
      </p>
      <div className="flex flex-col gap-10">
        {rows.map(({ product, quotes }) => (
          <div key={product.id}>
            <h2 className="mb-3 text-lg font-semibold">{product.name}</h2>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2">Retailer</th>
                    <th className="px-4 py-2">Pack Qty</th>
                    <th className="px-4 py-2">Product Price</th>
                    <th className="px-4 py-2">Carrier</th>
                    <th className="px-4 py-2">Shipping</th>
                    <th className="px-4 py-2">Total Landed Cost</th>
                    <th className="px-4 py-2">Est. Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-2">{quote.retailer}</td>
                      <td className="px-4 py-2">{quote.packQuantity}</td>
                      <td className="px-4 py-2">${quote.productPrice.toFixed(2)}</td>
                      <td className="px-4 py-2">{quote.carrier}</td>
                      <td className="px-4 py-2">${quote.shippingCost.toFixed(2)}</td>
                      <td className="px-4 py-2 font-medium">
                        ${quote.totalLandedCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">{quote.estimatedDelivery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
