"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MonthSelector } from "@/components/month-selector";
import { RatioBar } from "@/components/ratio-bar";
import { SmartInput } from "@/components/smart-input";
import { ExpensePieChart } from "@/components/expense-pie-chart";
import { CategoryIcon } from "@/components/category-icon";
import { TransactionForm } from "@/components/transaction-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatAmount, useBudget } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { ready, expenseByCategory, monthTransactions, totals, currency, categories } =
    useBudget();
  const [addOpen, setAddOpen] = useState(false);

  // Revenus agrégés par catégorie
  const incomeByCategory = categories
    .filter((c) => c.kind === "income")
    .map((category) => ({
      category,
      total: monthTransactions
        .filter((t) => t.type === "income" && t.categoryId === category.id)
        .reduce((s, t) => s + t.amount, 0)
    }))
    .filter((e) => e.total > 0);

  return (
    <div className="board-bg wood-frame flex min-h-0 flex-1 flex-col pt-5 text-chalk">
      {/* Partie fixe : mois, ratio, ajout magique */}
      <div className="space-y-5">
        <MonthSelector />
        <RatioBar />
        <SmartInput />
      </div>

      {/* Partie défilante : totaux par catégorie + camembert */}
      <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-28">
      {/* Totaux par catégorie (carte) */}
      <section
        aria-label="Totaux par catégorie"
        className="mx-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
      >
        {!ready ? (
          <p className="text-center text-sm text-chalkDim">Chargement…</p>
        ) : (
          <ul className="space-y-2.5 text-[15px] font-medium">
            {incomeByCategory.map(({ category, total }) => (
              <li key={category.id} className="flex items-baseline gap-3">
                <CategoryIcon name={category.icon} className="h-5 w-5 shrink-0 translate-y-0.5 text-chalkGreen/80" />
                <span className="chalk-green min-w-0 flex-shrink truncate">{category.name}</span>
                <span className="mx-1 min-w-3 flex-1" />
                <span className="chalk-green shrink-0 whitespace-nowrap">
                  + {formatAmount(total, currency)}
                </span>
              </li>
            ))}

            {expenseByCategory.map(({ category, total }) => (
              <li key={category.id} className="flex items-baseline gap-3">
                <CategoryIcon name={category.icon} className="h-5 w-5 shrink-0 translate-y-0.5 text-brick/80" />
                <span className="chalk-red min-w-0 flex-shrink truncate">{category.name}</span>
                <span className="mx-1 min-w-3 flex-1" />
                <span className="chalk-red shrink-0 whitespace-nowrap">
                  − {formatAmount(total, currency)}
                </span>
              </li>
            ))}

            {incomeByCategory.length === 0 && expenseByCategory.length === 0 && (
              <li className="py-4 text-center text-sm font-normal text-chalkDim">
                Aucune opération ce mois-ci — notez la première.
              </li>
            )}

            {/* Ligne Solde */}
            <li className="mt-3 flex items-baseline gap-3 border-t border-white/10 pt-3 text-lg font-bold">
              <span className="text-chalk">Solde</span>
              <span className="mx-1 flex-1" />
              <span className={cn(totals.balance >= 0 ? "chalk-green" : "chalk-red")}>
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
        className="fixed bottom-24 right-[max(1rem,calc(50%-13rem))] z-30 rounded-full bg-chalkGreen p-4 text-board shadow-lg shadow-chalkGreen/25 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk"
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
