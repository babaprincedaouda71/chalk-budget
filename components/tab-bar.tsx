"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, Tags, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Dépenses", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/categories", label: "Catégories", icon: Tags },
  { href: "/settings", label: "Paramètres", icon: Settings }
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 border-t border-black/40 bg-boardEdge/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50",
                  active ? "text-chalk" : "text-chalkDim/70 hover:text-chalkDim"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className={cn(active && "font-bold")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
