"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PeriodNav, PeriodPill } from "@/components/period-control";
import { RatioBar } from "@/components/ratio-bar";
import { SmartInput } from "@/components/smart-input";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { CategoryIcon } from "@/components/category-icon";
import { TransactionForm } from "@/components/transaction-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatAmount, useBudget } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { ready, expenseByCategory, periodTransactions, totals, currency, categories } =
    useBudget();
  const [addOpen, setAddOpen] = useState(false);

  // Revenus agrégés par catégorie
  const incomeByCategory = categories
    .filter((c) => c.kind === "income")
    .map((category) => ({
      category,
      total: periodTransactions
        .filter((t) => t.type === "income" && t.categoryId === category.id)
        .reduce((s, t) => s + t.amount, 0)
    }))
    .filter((e) => e.total > 0);

  return (
    <div className="paper-bg flex min-h-0 flex-1 flex-col pt-4 text-ink">
      {/* Partie fixe : temporalité, ratio, ajout magique */}
      <div className="space-y-5">
        {/* En-tête : pilule de période centrée + navigation dessous
            (structure identique à la page Transactions). */}
        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4">
            <span aria-hidden />
            <PeriodPill />
            <span aria-hidden />
          </div>
          <PeriodNav className="mt-1" />
        </div>
        <RatioBar />
        <SmartInput />
      </div>

      {/* Partie défilante : totaux par catégorie + camembert */}
      <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-28">
      {/* Totaux par catégorie (carte) */}
      <section
        aria-label="Totaux par catégorie"
        className="mx-4 rounded-2xl bg-white/60 p-4 ring-1 ring-ink/10"
      >
        {!ready ? (
          <p className="text-center text-sm text-inkSoft">Chargement…</p>
        ) : (
          <ul className="space-y-2.5 text-[15px] font-medium">
            {incomeByCategory.map(({ category, total }) => (
              <li key={category.id} className="flex items-baseline gap-3">
                <CategoryIcon name={category.icon} className="h-5 w-5 shrink-0 translate-y-0.5 text-greenDeep" />
                <span className="min-w-0 flex-shrink truncate text-greenDeep">{category.name}</span>
                <span className="mx-1 min-w-3 flex-1" />
                <span className="shrink-0 whitespace-nowrap text-greenDeep">
                  + {formatAmount(total, currency)}
                </span>
              </li>
            ))}

            {expenseByCategory.map(({ category, total }) => (
              <li key={category.id} className="flex items-baseline gap-3">
                <CategoryIcon name={category.icon} className="h-5 w-5 shrink-0 translate-y-0.5 text-brickDeep" />
                <span className="min-w-0 flex-shrink truncate text-brickDeep">{category.name}</span>
                <span className="mx-1 min-w-3 flex-1" />
                <span className="shrink-0 whitespace-nowrap text-brickDeep">
                  − {formatAmount(total, currency)}
                </span>
              </li>
            ))}

            {incomeByCategory.length === 0 && expenseByCategory.length === 0 && (
              <li className="py-4 text-center text-sm font-normal text-inkSoft">
                Aucune opération sur cette période — notez la première.
              </li>
            )}

            {/* Ligne Solde */}
            <li className="mt-3 flex items-baseline gap-3 border-t border-ink/10 pt-3 text-lg font-bold">
              <span className="text-ink">Solde</span>
              <span className="mx-1 flex-1" />
              <span className={cn(totals.balance >= 0 ? "text-greenDeep" : "text-brickDeep")}>
                {totals.balance >= 0 ? "" : "− "}
                {formatAmount(Math.abs(totals.balance), currency)}
              </span>
            </li>
          </ul>
        )}
      </section>

      <ExpensePieChart />
      </div>

      {/* Bouton flottant d'ajout manuel */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter une transaction"
        className="fixed bottom-24 right-[max(1rem,calc(50%-13rem))] z-30 rounded-full bg-greenDeep p-4 text-white shadow-lg shadow-greenDeep/25 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-greenDeep/50"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouvelle transaction</DialogTitle>
          <TransactionForm onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
