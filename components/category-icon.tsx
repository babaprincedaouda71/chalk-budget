"use client";

import {
  Baby, Bus, CircleDashed, Fuel, Gamepad2, HeartPulse, Home,
  PiggyBank, ShoppingBag, ShoppingBasket, UtensilsCrossed, Wallet,
  type LucideIcon
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Baby, Bus, CircleDashed, Fuel, Gamepad2, HeartPulse, Home,
  PiggyBank, ShoppingBag, ShoppingBasket, UtensilsCrossed, Wallet
};

export function CategoryIcon({
  name,
  className
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? CircleDashed;
  return <Icon className={className} strokeWidth={1.8} aria-hidden />;
}

export const ICON_NAMES = Object.keys(ICONS);
