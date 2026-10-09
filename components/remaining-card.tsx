"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatAmount, useBudget } from "@/lib/store";
import { periodLabel } from "@/lib/period";
import { remainingToLive } from "@/lib/remaining";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

/**
 * Carte « Reste à vivre » du tableau de bord : ce qu'il reste à dépenser
 * jusqu'à la fin du mois en cours (voir `lib/remaining.ts`). Affichée
 * seulement quand la période affichée est dans le mois en cours.
 */
export function RemainingCard() {
  const { ready, transactions, categories, anchor, currency } = useBudget();
  const [open, setOpen] = useState(false);
  // « Aujourd'hui » recalculé au retour sur l'app : la PWA peut rester
  // ouverte en arrière-plan plusieurs jours.
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setToday(new Date());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const r = useMemo(() => remainingToLive(transactions, today), [transactions, today]);

  const sameMonth =
    anchor.getFullYear() === today.getFullYear() && anchor.getMonth() === today.getMonth();
  if (!ready || !sameMonth || (r.income === 0 && r.spent === 0 && r.upcoming.length === 0)) {
    return null;
  }

  const fmt = (n: number) => formatAmount(n, currency);
  const negative = r.remaining < 0;
  const n = r.upcoming.length;

  return (
    <section
      aria-label="Reste à vivre"
      className="mx-4 rounded-2xl bg-white/60 p-4 ring-1 ring-ink/10"
    >
      <h2 className="text-sm font-medium text-inkSoft">
        Reste à vivre · {periodLabel("month", today)}
      </h2>
      <p
        className={cn(
          "mt-1 text-3xl font-bold tracking-tight",
          negative ? "text-brickDeep" : "text-greenDeep"
        )}
      >
        {negative ? "− " : ""}
        {fmt(Math.abs(r.remaining))}
      </p>
      <p className="mt-0.5 text-sm text-inkSoft">
        {negative
          ? "Dépassement prévu d'ici la fin du mois"
          : r.daysLeft === 1
            ? "pour aujourd'hui, dernier jour du mois"
            : `soit ${fmt(r.perDay)} par jour pendant ${r.daysLeft} jours`}
      </p>

      <ul className="mt-3 space-y-1.5 border-t border-ink/10 pt-3 text-sm">
        <li className="flex items-baseline gap-2">
          <span className="flex-1">
            Revenus du mois
            {r.incomeExpected > 0 && (
              <span className="text-inkSoft"> (dont {fmt(r.incomeExpected)} attendus)</span>
            )}
          </span>
          <span className="shrink-0 whitespace-nowrap font-medium text-greenDeep">
            + {fmt(r.income)}
          </span>
        </li>
        <li className="flex items-baseline gap-2">
          <span className="flex-1">Déjà dépensé</span>
          <span className="shrink-0 whitespace-nowrap font-medium text-brickDeep">
            − {fmt(r.spent)}
          </span>
        </li>
        <li>
          {n === 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="flex-1">Dépenses prévues</span>
              <span className="shrink-0 whitespace-nowrap text-inkSoft">aucune</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex w-full items-baseline gap-2 text-left"
            >
              <span className="flex-1">
                Dépenses prévues{" "}
                <span className="text-inkSoft">({n})</span>
                <ChevronDown
                  className={cn(
                    "ml-1 inline h-4 w-4 -translate-y-px text-inkSoft transition-transform",
                    open && "rotate-180"
                  )}
                />
              </span>
              <span className="shrink-0 whitespace-nowrap font-medium text-brickDeep">
                − {fmt(r.upcomingTotal)}
              </span>
            </button>
          )}
        </li>
      </ul>

      {open && n > 0 && (
        <ul className="mt-2 space-y-1.5 rounded-xl bg-ink/[0.03] p-3 text-sm">
          {r.upcoming.map(({ tx, date, key }) => {
            const category = categories.find((c) => c.id === tx.categoryId);
            return (
              <li key={key} className="flex items-baseline gap-2">
                <span className="w-12 shrink-0 text-xs text-inkSoft">
                  {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short"
                  })}
                </span>
                <CategoryIcon
                  name={category?.icon ?? "CircleDashed"}
                  className="h-4 w-4 shrink-0 translate-y-0.5 text-inkSoft"
                />
                <span className="min-w-0 flex-1 truncate">
                  {tx.note || category?.name || "Sans libellé"}
                </span>
                <span className="shrink-0 whitespace-nowrap text-brickDeep">
                  − {fmt(tx.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
