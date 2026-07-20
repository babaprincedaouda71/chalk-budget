"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { CategoryIcon, ICON_NAMES } from "@/components/category-icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useBudget } from "@/lib/store";
import { Category, TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useBudget();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_NAMES[0]);
  const [kind, setKind] = useState<TxType>("expense");
  const [keywords, setKeywords] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Onglet affiché : dépenses ou revenus (interrupteur à segments).
  const [tab, setTab] = useState<TxType>("expense");

  // Dernière catégorie de son type : suppression impossible (les transactions
  // n'auraient plus de catégorie de repli).
  const lastOfKind =
    !!editing && categories.filter((c) => c.kind === editing.kind).length <= 1;

  const startCreate = () => {
    setEditing(null);
    setName("");
    setIcon(ICON_NAMES[0]);
    setKind(tab); // pré-sélectionne le type de l'onglet courant
    setKeywords("");
    setConfirmDelete(false);
    setOpen(true);
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setIcon(c.icon);
    setKind(c.kind);
    setKeywords(c.keywords.join(", "));
    setConfirmDelete(false);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) return;
    const parsedKeywords = keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (editing) {
      updateCategory({ ...editing, name: name.trim(), icon, keywords: parsedKeywords });
    } else {
      addCategory({ name: name.trim(), icon, kind, keywords: parsedKeywords });
    }
    setOpen(false);
  };

  const remove = () => {
    if (!editing) return;
    deleteCategory(editing.id);
    setOpen(false);
  };

  const Section = ({ kind }: { kind: TxType }) => (
    <section className="mb-6">
      <ul className="divide-y divide-ink/10 rounded-xl border border-ink/15 bg-white/40">
        {categories
          .filter((c) => c.kind === kind)
          .map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => startEdit(c)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-ink/5"
              >
                <CategoryIcon name={c.icon} className="h-5 w-5 shrink-0 text-inkSoft" />
                <span className="flex-1 truncate">{c.name}</span>
                {c.keywords.length > 0 && (
                  <span className="max-w-[35%] truncate text-xs text-inkSoft">
                    {c.keywords.slice(0, 4).join(", ")}
                    {c.keywords.length > 4 ? "…" : ""}
                  </span>
                )}
                <Pencil className="h-3.5 w-3.5 shrink-0 text-inkSoft/60" />
              </button>
            </li>
          ))}
      </ul>
    </section>
  );

  return (
    <div className="paper-bg flex min-h-0 flex-1 flex-col px-4 pt-5 text-ink">
      {/* En-tête fixe : titre + interrupteur ; la liste défile en dessous */}
      <h1 className="mb-4 text-xl font-bold">Catégories</h1>

      {/* Interrupteur à segments Dépenses / Revenus */}
      <div
        role="tablist"
        aria-label="Type de catégories"
        className="mb-4 flex rounded-xl bg-ink/5 p-1 ring-1 ring-ink/10"
      >
        {(["expense", "income"] as TxType[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-bold transition",
              tab === k
                ? "bg-white text-ink shadow-sm"
                : "text-inkSoft hover:text-ink"
            )}
          >
            {k === "expense" ? "Dépenses" : "Revenus"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
        <Section kind={tab} />

        <button
          onClick={startCreate}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/30 py-3 font-medium text-inkSoft transition hover:border-ink/60 hover:text-ink"
        >
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>
            {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <div className="space-y-4">
            {/* Le type n'est pas modifiable après création : les transactions
                existantes de la catégorie sont typées en conséquence. */}
            {!editing && (
              <div className="flex items-center justify-between rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5">
                <span className={cn(kind === "expense" ? "text-brickDeep" : "text-inkSoft")}>
                  Dépense
                </span>
                <Switch
                  checked={kind === "income"}
                  onCheckedChange={(v) => setKind(v ? "income" : "expense")}
                  aria-label="Type de catégorie"
                />
                <span className={cn(kind === "income" ? "text-emerald-600" : "text-inkSoft")}>
                  Revenu
                </span>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-sm text-inkSoft">Nom</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ink/20 bg-white/60 px-3 py-2 focus:border-ink/50 focus:outline-none"
              />
            </label>

            <fieldset>
              <legend className="mb-1 text-sm text-inkSoft">Icône</legend>
              <div className="grid grid-cols-6 gap-2">
                {ICON_NAMES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setIcon(n)}
                    aria-pressed={icon === n}
                    className={cn(
                      "flex items-center justify-center rounded-lg border p-2",
                      icon === n
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/20 text-ink hover:border-ink/50"
                    )}
                  >
                    <CategoryIcon name={n} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1 block text-sm text-inkSoft">
                Mots-clés (séparés par des virgules)
              </span>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="ex. essence, gasoil, station"
                className="w-full rounded-lg border border-ink/20 bg-white/60 px-3 py-2 focus:border-ink/50 focus:outline-none"
              />
            </label>

            <button
              onClick={save}
              disabled={!name.trim()}
              className="w-full rounded-lg bg-ink py-2.5 font-bold text-paper disabled:opacity-40"
            >
              {editing ? "Enregistrer" : "Créer"}
            </button>

            {editing && !lastOfKind && (
              !confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full rounded-lg border border-brickDeep/40 py-2.5 font-medium text-brickDeep transition hover:bg-brickDeep/10"
                >
                  Supprimer la catégorie…
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-inkSoft">
                    Ses transactions basculeront vers « Divers » (ou la première
                    catégorie du même type).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-ink/25 py-2.5"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={remove}
                      className="flex-1 rounded-lg bg-brickDeep py-2.5 font-bold text-paper"
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}