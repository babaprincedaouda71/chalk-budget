"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "./category-icon";
import { CategoryPicker } from "./category-picker";
import { useBudget } from "@/lib/store";
import { Transaction, TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  /** transaction existante = mode édition */
  initial?: Transaction;
  onDone: () => void;
}

export function TransactionForm({ initial, onDone }: Props) {
  const { categories, currency, addTransactions, updateTransaction, deleteTransaction } =
    useBudget();

  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(initial?.note ?? "");
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);

  const typeCategories = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type]
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? typeCategories[0]?.id ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedCategory = typeCategories.find((c) => c.id === categoryId);

  const switchType = (income: boolean) => {
    const next: TxType = income ? "income" : "expense";
    setType(next);
    const first = categories.find((c) => c.kind === next);
    if (first) setCategoryId(first.id);
  };

  const valid = parseFloat(amount.replace(",", ".")) > 0 && categoryId && date;

  const save = () => {
    if (!valid) return;
    const tx = {
      type,
      amount: parseFloat(amount.replace(",", ".")),
      date,
      categoryId,
      note: note.trim() || undefined,
      recurring
    };
    if (initial) updateTransaction({ ...tx, id: initial.id });
    else addTransactions([tx]);
    onDone();
  };

  return (
    <div className="space-y-4">
      {/* Interrupteur Revenu / Dépense */}
      <div className="flex items-center justify-between rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5">
        <span className={cn("font-medium", type === "expense" ? "text-brickDeep" : "text-inkSoft")}>
          Dépense
        </span>
        <Switch
          checked={type === "income"}
          onCheckedChange={switchType}
          aria-label="Basculer entre dépense et revenu"
        />
        <span className={cn("font-medium", type === "income" ? "text-green-700" : "text-inkSoft")}>
          Revenu
        </span>
      </div>

      {/* Montant */}
      <label className="block">
        <span className="mb-1 block text-sm text-inkSoft">Montant ({currency})</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-full rounded-lg border border-ink/20 bg-white/60 px-3 py-2.5 text-2xl font-bold text-ink focus:border-ink/50 focus:outline-none"
        />
      </label>

      {/* Date */}
      <label className="block">
        <span className="mb-1 block text-sm text-inkSoft">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-ink/20 bg-white/60 px-3 py-2 text-ink focus:border-ink/50 focus:outline-none"
        />
      </label>

      {/* Catégorie : ouvre une page de sélection dédiée */}
      <div>
        <span className="mb-1 block text-sm text-inkSoft">Catégorie</span>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg border border-ink/20 bg-white/60 px-3 py-2.5 text-left transition hover:border-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          {selectedCategory ? (
            <>
              <CategoryIcon
                name={selectedCategory.icon}
                className="h-5 w-5 shrink-0 text-inkSoft"
              />
              <span className="flex-1 truncate">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="flex-1 text-inkSoft">Choisir une catégorie…</span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-inkSoft" />
        </button>
      </div>

      <CategoryPicker
        open={pickerOpen}
        type={type}
        selectedId={categoryId}
        onSelect={(id) => {
          if (id) setCategoryId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* Note */}
      <label className="block">
        <span className="mb-1 block text-sm text-inkSoft">Note (facultatif)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ex. tomates, oignons"
          className="w-full rounded-lg border border-ink/20 bg-white/60 px-3 py-2 text-ink focus:border-ink/50 focus:outline-none"
        />
      </label>

      {/* Récurrence */}
      <div className="flex items-center justify-between rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5">
        <div>
          <p className="font-medium text-ink">Récurrente</p>
          <p className="text-xs text-inkSoft">Se répète tous les mois à partir de sa date</p>
        </div>
        <Switch checked={recurring} onCheckedChange={setRecurring} aria-label="Transaction récurrente" />
      </div>

      <div className="flex gap-2 pt-1">
        {initial && (
          <button
            type="button"
            onClick={() => {
              deleteTransaction(initial.id);
              onDone();
            }}
            className="rounded-lg border border-brickDeep/40 px-4 py-2.5 font-medium text-brickDeep transition hover:bg-brickDeep/10"
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!valid}
          className="flex-1 rounded-lg bg-ink py-2.5 font-bold text-paper transition hover:bg-ink/85 disabled:opacity-40"
        >
          {initial ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
