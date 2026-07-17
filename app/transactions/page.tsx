"use client";

import { useMemo, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { TransactionForm } from "@/components/transaction-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MONTH_NAMES, formatAmount, useBudget } from "@/lib/store";
import { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const { monthTransactions, categories, currency, month, setMonth } = useBudget();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const cat = (id: string) => categories.find((c) => c.id === id);

  // Groupement par date (les récurrentes d'un mois antérieur : groupe dédié)
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of monthTransactions) {
      const d = new Date(t.date + "T00:00:00");
      const inMonth = d.getFullYear() === month.year && d.getMonth() === month.month;
      const key = inMonth ? t.date : "recurring";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === "recurring" ? 1 : b[0] === "recurring" ? -1 : b[0].localeCompare(a[0])
    );
  }, [monthTransactions, month]);

  const dateLabel = (key: string) =>
    key === "recurring"
      ? "Récurrentes (mois antérieurs)"
      : new Date(key + "T00:00:00").toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long"
        });

  const shift = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="paper-bg notebook-margin min-h-dvh text-ink">
      {/* En-tête du carnet */}
      <header className="flex items-center justify-between border-b-2 border-ink/15 px-4 py-4 pl-12">
        <button onClick={() => shift(-1)} className="text-inkSoft hover:text-ink" aria-label="Mois précédent">
          ←
        </button>
        <h1 className="text-xl font-bold">
          {MONTH_NAMES[month.month]} {month.year}
        </h1>
        <button onClick={() => shift(1)} className="text-inkSoft hover:text-ink" aria-label="Mois suivant">
          →
        </button>
      </header>

      <div className="notebook-lines min-h-[70vh] pl-12 pr-4">
        {groups.length === 0 && (
          <p className="pt-10 text-center text-inkSoft">
            Page blanche : aucune transaction ce mois-ci.
          </p>
        )}

        {groups.map(([key, txs]) => (
          <section key={key} aria-label={dateLabel(key)}>
            <h2 className="flex h-10 items-end pb-1 text-xs font-bold uppercase tracking-wider text-inkSoft">
              {dateLabel(key)}
            </h2>
            <ul>
              {txs.map((t) => {
                const c = cat(t.categoryId);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setEditing(t)}
                      className="flex h-10 w-full items-center gap-3 text-left hover:bg-ink/5 focus-visible:outline-none focus-visible:bg-ink/5"
                    >
                      <CategoryIcon name={c?.icon ?? "CircleDashed"} className="h-4 w-4 shrink-0 text-inkSoft" />
                      <span className="min-w-0 flex-1 truncate">
                        {t.note || c?.name || "—"}
                        {t.note && c && (
                          <span className="ml-2 text-xs text-inkSoft">{c.name}</span>
                        )}
                      </span>
                      {t.recurring && <Repeat className="h-3.5 w-3.5 shrink-0 text-inkSoft" aria-label="Récurrente" />}
                      <span
                        className={cn(
                          "shrink-0 font-bold tabular-nums",
                          t.type === "income" ? "text-green-700" : "text-brickDeep"
                        )}
                      >
                        {t.type === "income" ? "+" : "−"} {formatAmount(t.amount, currency)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter une transaction"
        className="fixed bottom-24 right-1/2 z-30 translate-x-[calc(theme(maxWidth.app)/2-4rem)] rounded-full bg-ink p-4 text-paper shadow-xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouvelle transaction</DialogTitle>
          <TransactionForm onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogTitle>Modifier la transaction</DialogTitle>
          {editing && (
            <TransactionForm initial={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
