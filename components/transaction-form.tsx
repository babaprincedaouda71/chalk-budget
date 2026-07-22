"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DialogTitle } from "@/components/ui/dialog";
import { CategoryIcon } from "./category-icon";
import { CategoryList } from "./category-picker";
import { RecurringScopeDialog } from "./recurring-scope-dialog";
import { SegmentedControl } from "./segmented-control";
import { useBudget } from "@/lib/store";
import { RecurringScope, Transaction, TxType } from "@/lib/types";
import { cn, toISODate } from "@/lib/utils";

interface Props {
  /** transaction existante = mode édition */
  initial?: Transaction;
  /**
   * Date effective de l'occurrence éditée (yyyy-mm-dd). Pour une récurrente,
   * c'est le mois sur lequel l'utilisateur a tapé — pré-remplit le champ date
   * et sert de portée aux modifications. Par défaut : la date de `initial`.
   */
  occurrenceDate?: string;
  onDone: () => void;
}

export function TransactionForm({ initial, occurrenceDate, onDone }: Props) {
  const {
    categories,
    currency,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    updateRecurring,
    deleteRecurring
  } = useBudget();

  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(
    occurrenceDate ?? initial?.date ?? toISODate()
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [recurring, setRecurring] = useState(initial?.recurring ?? false);
  // Dialogue de portée (récurrentes) : "save" ou "delete" en attente.
  const [scopePrompt, setScopePrompt] = useState<"save" | "delete" | null>(null);

  const typeCategories = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type]
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? typeCategories[0]?.id ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  // Recherche dans la grille de catégories (réinitialisée à chaque ouverture).
  const [catQuery, setCatQuery] = useState("");
  const selectedCategory = typeCategories.find((c) => c.id === categoryId);

  const switchType = (income: boolean) => {
    const next: TxType = income ? "income" : "expense";
    setType(next);
    const first = categories.find((c) => c.kind === next);
    if (first) setCategoryId(first.id);
  };

  const valid = parseFloat(amount.replace(",", ".")) > 0 && categoryId && date;

  const buildTx = (): Omit<Transaction, "id"> => ({
    type,
    amount: parseFloat(amount.replace(",", ".")),
    date,
    categoryId,
    note: note.trim() || undefined,
    recurring
  });

  const save = () => {
    if (!valid) return;
    if (initial) {
      // Récurrente : demander la portée avant d'appliquer.
      if (initial.recurring) {
        setScopePrompt("save");
        return;
      }
      updateTransaction({ ...buildTx(), id: initial.id });
    } else {
      addTransactions([buildTx()]);
    }
    onDone();
  };

  const remove = () => {
    if (!initial) return;
    if (initial.recurring) {
      setScopePrompt("delete");
      return;
    }
    deleteTransaction(initial.id);
    onDone();
  };

  // Applique l'action en attente (save/delete) avec la portée choisie.
  const applyScope = (scope: RecurringScope) => {
    if (!initial) return;
    const occDate = occurrenceDate ?? initial.date;
    if (scopePrompt === "delete") {
      deleteRecurring(initial, occDate, scope);
    } else {
      updateRecurring(initial, occDate, buildTx(), scope);
    }
    setScopePrompt(null);
    onDone();
  };

  // Sous-page « choix de catégorie » : affichée DANS le même dialogue
  // (échange de contenu), avec le titre du dialogue qui devient contextuel.
  // Ne pas rouvrir un second Dialog modal par-dessus celui du formulaire :
  // le verrou de défilement du dialogue parent bloque le scroll de tout
  // contenu portalé hors de son sous-arbre.
  if (pickerOpen) {
    return (
      <div>
        <header className="mb-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            aria-label="Retour au formulaire"
            className="-ml-2 rounded-full p-2 text-inkSoft transition hover:bg-ink/10 hover:text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <DialogTitle className="mb-0">Choisir une catégorie</DialogTitle>
        </header>

        {/* Recherche : reste visible, seule la grille défile en dessous. */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft" />
          <input
            type="search"
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            placeholder="Rechercher une catégorie…"
            aria-label="Rechercher une catégorie"
            className="w-full rounded-lg border border-ink/20 bg-white/60 py-2 pl-9 pr-8 text-sm text-ink placeholder:text-inkSoft/70 focus:border-ink/50 focus:outline-none"
          />
          {catQuery && (
            <button
              type="button"
              onClick={() => setCatQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-inkSoft hover:bg-ink/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Zone défilante : hauteur plafonnée pour que l'en-tête, la
            recherche et le bouton Fermer du dialogue restent visibles. */}
        <div className="-mx-1 max-h-[min(50dvh,22rem)] overflow-y-auto px-1 pb-1">
          <CategoryList
            type={type}
            selectedId={categoryId}
            query={catQuery}
            onSelect={(id) => {
              if (id) setCategoryId(id);
              setPickerOpen(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DialogTitle>
        {initial ? "Modifier la transaction" : "Nouvelle transaction"}
      </DialogTitle>

      {/* Type : dépense ou revenu */}
      <SegmentedControl
        ariaLabel="Type de transaction"
        options={[
          { value: "expense", label: "Dépense" },
          { value: "income", label: "Revenu" }
        ]}
        value={type}
        onChange={(v) => switchType(v === "income")}
      />

      {/* Montant */}
      <label className="block">
        <span className="mb-1 block text-sm text-inkSoft">Montant ({currency})</span>
        <input
          // type="text" (et non "number") : un input number vide sa valeur si
          // l'utilisateur saisit une virgule décimale sur certains claviers
          // mobiles. On garde le pavé numérique via inputMode et on n'accepte
          // que chiffres, point et virgule.
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
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
          onClick={() => {
            setCatQuery("");
            setPickerOpen(true);
          }}
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
            onClick={remove}
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

      <RecurringScopeDialog
        open={scopePrompt !== null}
        action={scopePrompt === "delete" ? "delete" : "save"}
        onChoose={applyScope}
        onCancel={() => setScopePrompt(null)}
      />
    </div>
  );
}
