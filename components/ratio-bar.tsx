"use client";

import { formatAmount, useBudget } from "@/lib/store";

/**
 * Barre de consommation du budget : la part verte représente ce qu'il reste
 * des revenus du mois, la part rouge ce qui a déjà été dépensé.
 * Entièrement rouge dès que les dépenses atteignent ou dépassent les revenus.
 */
export function RatioBar() {
  const { totals, currency } = useBudget();
  const { income, expense } = totals;

  // Part du revenu déjà dépensée, bornée à 100 %.
  const spentPct =
    income > 0 ? Math.min(100, (expense / income) * 100) : expense > 0 ? 100 : 0;
  const greenPct = 100 - spentPct;
  const empty = income === 0 && expense === 0;
  const overspent = expense > income;

  return (
    <div className="px-4">
      <div
        role="img"
        aria-label={`Dépensé ${formatAmount(expense, currency)} sur ${formatAmount(
          income,
          currency
        )} de revenus`}
        className="relative h-4 overflow-hidden rounded-full bg-ink/10"
      >
        {!empty && greenPct > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-b from-greenDeep to-[#10B981] transition-all duration-500"
            style={{ width: `${greenPct}%` }}
          />
        )}
        {!empty && spentPct > 0 && (
          <div
            className="absolute inset-y-0 right-0 bg-gradient-to-b from-brickDeep to-[#BE123C] transition-all duration-500"
            style={{ width: `${spentPct}%` }}
          />
        )}
        {/* jointure entre part restante et part dépensée */}
        {!empty && greenPct > 0 && spentPct > 0 && (
          <div
            className="absolute inset-y-0 w-[2px] bg-white/80 transition-all duration-500"
            style={{ left: `${greenPct}%` }}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-baseline justify-between text-sm">
        <span className="text-greenDeep">
          + {formatAmount(income, currency)}
        </span>
        <span className="text-inkSoft">
          {empty
            ? "Rien sur cette période"
            : overspent
              ? "Budget dépassé !"
              : `Reste ${formatAmount(income - expense, currency)}`}
        </span>
        <span className="text-brickDeep">
          − {formatAmount(expense, currency)}
        </span>
      </div>
    </div>
  );
}
