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
      {/* Agrégation par catégorie, écrite « à la craie » */}
      <section aria-label="Totaux par catégorie" className="px-5">
        {!ready ? (
          <p className="chalk-text text-center text-xl text-chalkDim">Chargement…</p>
        ) : (
          <ul className="chalk-text space-y-1 text-2xl">
            {incomeByCategory.map(({ category, total }) => (
              <li key={category.id} className="flex items-baseline gap-3">
                <CategoryIcon name={category.icon} className="h-5 w-5 shrink-0 translate-y-0.5 text-chalkGreen/80" />
                <span className="chalk-green min-w-0 flex-shrink truncate">{category.name}</span>
                <span className="mx-1 min-w-3 flex-1 border-b border-dotted border-chalk/25" />
                <span className="chalk-green shrink-0 whitespace-nowrap">
                  + {formatAmount(total, currency)}
                </span>
              </li>
            ))}

            {expenseByCategory.map(({ category, total }) => (
              <li key={category.id} className="flex items-baseline gap-3">
                <CategoryIcon name={category.icon} className="h-5 w-5 shrink-0 translate-y-0.5 text-brick/80" />
                <span className="chalk-red min-w-0 flex-shrink truncate">{category.name}</span>
                <span className="mx-1 min-w-3 flex-1 border-b border-dotted border-chalk/25" />
                <span className="chalk-red shrink-0 whitespace-nowrap">
                  − {formatAmount(total, currency)}
                </span>
              </li>
            ))}

            {incomeByCategory.length === 0 && expenseByCategory.length === 0 && (
              <li className="py-4 text-center text-xl text-chalkDim">
                Le tableau est vierge — notez votre première opération.
              </li>
            )}

            {/* Ligne Solde */}
            <li className="mt-3 flex items-baseline gap-3 border-t border-chalk/25 pt-3 text-3xl">
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
        className="fixed bottom-24 right-[max(1rem,calc(50%-13rem))] z-30 rounded-full bg-chalk p-4 text-board shadow-xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk"
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
