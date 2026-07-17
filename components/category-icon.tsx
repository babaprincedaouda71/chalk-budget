"use client";

import {
  Baby, Banknote, Briefcase, Bus, CircleDashed, Coins, Fuel, Gamepad2, Gift,
  GraduationCap, HandCoins, HandHeart, Heart, HeartPulse, Home, PiggyBank,
  Plane, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Sparkles, SprayCan,
  TrendingUp, Tv, Users, UtensilsCrossed, Wallet, Wifi,
  type LucideIcon
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Baby, Banknote, Briefcase, Bus, CircleDashed, Coins, Fuel, Gamepad2, Gift,
  GraduationCap, HandCoins, HandHeart, Heart, HeartPulse, Home, PiggyBank,
  Plane, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Sparkles, SprayCan,
  TrendingUp, Tv, Users, UtensilsCrossed, Wallet, Wifi
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