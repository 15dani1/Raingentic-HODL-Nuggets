/**
 * In-memory log of completed orders, used to compute and display the
 * agent's profit per transaction (the spread between what the agent
 * actually paid — product + shipping via Rain — and what the user was
 * charged). Not persisted — resets on server restart, same tradeoff as
 * callLog.ts. Good enough for a hackathon demo.
 *
 * Owned by: backend team.
 */

export interface OrderLogEntry {
  id: number;
  timestamp: string; // ISO 8601
  orderId: string;
  productId: string;
  retailer: string;
  carrier: string;
  /** What the agent actually paid the retailer, including shipping. */
  totalPaidByAgent: number;
  /** What the agent charged the user. */
  totalChargedToUser: number;
  /** totalChargedToUser - totalPaidByAgent. */
  profit: number;
}

const MAX_ENTRIES = 200;
const orders: OrderLogEntry[] = [];
let nextId = 1;

export function recordOrder(
  entry: Omit<OrderLogEntry, "id" | "timestamp" | "profit">,
): OrderLogEntry {
  const full: OrderLogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    profit: Math.round((entry.totalChargedToUser - entry.totalPaidByAgent) * 100) / 100,
    ...entry,
  };
  orders.push(full);
  if (orders.length > MAX_ENTRIES) orders.shift();
  return full;
}

export function getOrderLog(): OrderLogEntry[] {
  // Newest first.
  return [...orders].reverse();
}

export interface ProfitStats {
  totalOrders: number;
  totalProfit: number;
  avgProfit: number;
  totalRevenue: number;
  totalCost: number;
}

export function getProfitStats(): ProfitStats {
  const totalOrders = orders.length;
  const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalChargedToUser, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.totalPaidByAgent, 0);

  return {
    totalOrders,
    totalProfit: Math.round(totalProfit * 100) / 100,
    avgProfit: totalOrders === 0 ? 0 : Math.round((totalProfit / totalOrders) * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

/** Clears the log (useful for demos/tests). Not exposed via any API route. */
export function clearOrderLog() {
  orders.length = 0;
}
