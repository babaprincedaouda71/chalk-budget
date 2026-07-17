"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES, useBudget } from "@/lib/store";

export function MonthSelector() {
  const { month, setMonth } = useBudget();
  const now = new Date();
  const isCurrent = month.year === now.getFullYear() && month.month === now.getMonth();

  const shift = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="flex items-center justify-between px-2">
      <button
        onClick={() => shift(-1)}
        aria-label="Mois précédent"
        className="rounded-full p-2 text-chalkDim transition hover:bg-chalk/10 hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div className="text-center">
        <h1 className="chalk-text chalk-underline text-4xl font-bold text-chalk">
          {MONTH_NAMES[month.month]}
        </h1>
        <p className="mt-1 text-xs tracking-widest text-chalkDim/80">
          {month.year}
          {!isCurrent && " · autre mois"}
        </p>
      </div>

      <button
        onClick={() => shift(1)}
        aria-label="Mois suivant"
        className="rounded-full p-2 text-chalkDim transition hover:bg-chalk/10 hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
