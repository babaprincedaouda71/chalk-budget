"use client";

import { formatAmount, useBudget } from "@/lib/store";

/**
 * Barre horizontale bicolore : part verte = revenus, part rouge = dépenses,
 * proportionnelles au total (revenus + dépenses) du mois affiché.
 */
export function RatioBar() {
  const { totals, currency } = useBudget();
  const sum = totals.income + totals.expense;
  const greenPct = sum > 0 ? (totals.income / sum) * 100 : 50;

  return (
    <div className="px-4">
      <div
        role="img"
        aria-label={`Revenus ${formatAmount(totals.income, currency)}, dépenses ${formatAmount(totals.expense, currency)}`}
        className="relative h-4 overflow-hidden rounded-full bg-black/30 shadow-inner"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-gradient-to-b from-chalkGreen to-[#7FBF86] transition-all duration-500"
          style={{ width: `${greenPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-full bg-gradient-to-b from-brick to-brickDeep transition-all duration-500"
          style={{ width: `${100 - greenPct}%` }}
        />
        {/* jointure façon trait de craie */}
        <div
          className="absolute inset-y-0 w-[2px] bg-chalk/70 blur-[0.5px] transition-all duration-500"
          style={{ left: `${greenPct}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-sm">
        <span className="chalk-text chalk-green">
          + {formatAmount(totals.income, currency)}
        </span>
        <span className="chalk-text chalk-red">
          − {formatAmount(totals.expense, currency)}
        </span>
      </div>
    </div>
  );
}
