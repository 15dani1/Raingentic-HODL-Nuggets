/**
 * Shared top navigation, shown on every page. Lets you (and demo judges)
 * jump between the customer-facing marketplace, the internal retailer
 * dashboard, and the developer/engineering dashboard without typing URLs.
 *
 * Owned by: frontend/UI team.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Marketplace" },
  { href: "/dashboard", label: "Retailer Dashboard" },
  { href: "/dev", label: "Dev Dashboard" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-background/80 backdrop-blur dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Raingentic HODL Nuggets
        </Link>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-foreground text-background"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-900")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
