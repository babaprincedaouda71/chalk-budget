"use client";

import {
  Baby, Banknote, Briefcase, Bus, CircleDashed, Coins, Fuel, Gamepad2, Gift,
  GraduationCap, HandCoins, Handshake, HandHeart, Heart, HeartPulse, Home, Landmark, PiggyBank,
  Plane, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Sparkles, SprayCan,
  TrendingUp, Tv, Users, UtensilsCrossed, Wallet, Wifi, Zap,
  type LucideIcon
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Baby, Banknote, Briefcase, Bus, CircleDashed, Coins, Fuel, Gamepad2, Gift,
  GraduationCap, HandCoins, Handshake, HandHeart, Heart, HeartPulse, Home, Landmark, PiggyBank,
  Plane, Shirt, ShoppingBag, ShoppingBasket, ShoppingCart, Sparkles, SprayCan,
  TrendingUp, Tv, Users, UtensilsCrossed, Wallet, Wifi, Zap
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