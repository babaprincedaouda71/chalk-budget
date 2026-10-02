"use client";

import Link from "next/link";
import { formatAmount, useBudget } from "@/lib/store";
import { BudgetLevel } from "@/lib/budget";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

const LEVEL_TEXT: Record<BudgetLevel, string> = {
  ok: "text-greenDeep",
  warn: "text-amberDeep",
  over: "text-brickDeep"
};
const LEVEL_BAR: Record<BudgetLevel, string> = {
  ok: "bg-greenDeep",
  warn: "bg-amberDeep",
  over: "bg-brickDeep"
};

/**
 * Carte « Budgets » du tableau de bord : une jauge par catégorie de dépense
 * ayant un budget mensuel, calculée sur le mois de la période affichée.
 */
export function BudgetCard() {
  const { ready, budgets, budgetMonthLabel, currency } = useBudget();
  if (!ready) return null;

  if (budgets.length === 0) {
    return (
      <p className="mx-4 rounded-2xl bg-white/50 px-4 py-3 text-sm text-inkSoft ring-1 ring-ink/10">
        Fixez un budget mensuel par catégorie dans l&apos;onglet{" "}
        <Link href="/categories" className="font-medium text-ink underline underline-offset-2">
          Catégories
        </Link>{" "}
        pour suivre vos limites ici.
      </p>
    );
  }

  const alerts = budgets.filter((b) => b.level !== "ok").length;

  return (
    <section
      aria-label="Budgets du mois"
      className="mx-4 rounded-2xl bg-white/60 p-4 ring-1 ring-ink/10"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-bold">Budgets · {budgetMonthLabel}</h2>
        {alerts > 0 && (
          <span className="text-xs font-medium text-amberDeep">
            {alerts} à surveiller
          </span>
        )}
      </div>
      <ul className="space-y-3.5">
        {budgets.map((b) => (
          <li key={b.category.id}>
            <div className="mb-1 flex items-baseline gap-2 text-sm">
              <CategoryIcon
                name={b.category.icon}
                className="h-4 w-4 shrink-0 translate-y-0.5 text-inkSoft"
              />
              <span className="min-w-0 flex-1 truncate font-medium">{b.category.name}</span>
              <span className="shrink-0 whitespace-nowrap text-inkSoft">
                {formatAmount(b.spent, currency)} / {formatAmount(b.budget, currency)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Budget ${b.category.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(b.ratio, 1) * 100)}
              className="h-2 overflow-hidden rounded-full bg-ink/10"
            >
              <div
                className={cn("h-full rounded-full transition-all", LEVEL_BAR[b.level])}
                style={{ width: `${Math.min(b.ratio, 1) * 100}%` }}
              />
            </div>
            <p className={cn("mt-1 text-xs font-medium", LEVEL_TEXT[b.level])}>
              {b.remaining >= 0
                ? `Reste ${formatAmount(b.remaining, currency)}`
                : `Dépassé de ${formatAmount(-b.remaining, currency)}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
