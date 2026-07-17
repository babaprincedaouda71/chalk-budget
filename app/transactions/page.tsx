"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, Repeat, Search, X } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryPicker } from "@/components/category-picker";
import { TransactionForm } from "@/components/transaction-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MONTH_NAMES, formatAmount, useBudget } from "@/lib/store";
import { Transaction, TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | TxType;

export default function TransactionsPage() {
  const { monthTransactions, categories, currency, month, setMonth } = useBudget();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  const cat = (id: string) => categories.find((c) => c.id === id);

  const setType = (t: TypeFilter) => {
    setTypeFilter(t);
    setCategoryFilter(null); // la catégorie filtrée dépend du type
  };

  // Recherche (note + nom de catégorie) et filtres type/catégorie.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthTransactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (q) {
        const c = categories.find((x) => x.id === t.categoryId);
        const hay = `${t.note ?? ""} ${c?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTransactions, typeFilter, categoryFilter, search, categories]);

  const hasFilters = typeFilter !== "all" || !!categoryFilter || !!search.trim();
  const filterCategory = categoryFilter ? cat(categoryFilter) : null;

  // Groupement par date (les récurrentes d'un mois antérieur : groupe dédié)
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const d = new Date(t.date + "T00:00:00");
      const inMonth = d.getFullYear() === month.year && d.getMonth() === month.month;
      const key = inMonth ? t.date : "recurring";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === "recurring" ? 1 : b[0] === "recurring" ? -1 : b[0].localeCompare(a[0])
    );
  }, [filtered, month]);

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

      {/* Recherche + filtres */}
      <div className="border-b border-ink/10 py-3 pl-12 pr-4">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une transaction…"
            className="w-full rounded-lg border border-ink/20 bg-white/60 py-2 pl-9 pr-8 text-sm text-ink placeholder:text-inkSoft/70 focus:border-ink/50 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-inkSoft hover:bg-ink/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", "Toutes"],
              ["expense", "Dépenses"],
              ["income", "Revenus"]
            ] as [TypeFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setType(value)}
              aria-pressed={typeFilter === value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                typeFilter === value
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 bg-white/40 text-inkSoft hover:border-ink/50"
              )}
            >
              {label}
            </button>
          ))}

          {typeFilter !== "all" && (
            <button
              onClick={() => setFilterPickerOpen(true)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                filterCategory
                  ? "border-ink bg-ink text-paper"
                  : "border-dashed border-ink/40 bg-white/40 text-inkSoft hover:border-ink/60"
              )}
            >
              {filterCategory && (
                <CategoryIcon name={filterCategory.icon} className="h-3.5 w-3.5" />
              )}
              <span className="max-w-[10rem] truncate">
                {filterCategory ? filterCategory.name : "Catégorie"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="notebook-lines min-h-[70vh] pl-12 pr-4">
        {groups.length === 0 && (
          <p className="pt-10 text-center text-inkSoft">
            {hasFilters
              ? "Aucune transaction ne correspond à la recherche."
              : "Page blanche : aucune transaction ce mois-ci."}
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

      {typeFilter !== "all" && (
        <CategoryPicker
          open={filterPickerOpen}
          type={typeFilter}
          selectedId={categoryFilter}
          allowAll
          title="Filtrer par catégorie"
          onSelect={(id) => {
            setCategoryFilter(id);
            setFilterPickerOpen(false);
          }}
          onClose={() => setFilterPickerOpen(false)}
        />
      )}
    </div>
  );
}
