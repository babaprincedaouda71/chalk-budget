"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CategoryIcon, ICON_NAMES } from "@/components/category-icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useBudget } from "@/lib/store";
import { TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CategoriesPage() {
  const { categories, addCategory } = useBudget();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_NAMES[0]);
  const [kind, setKind] = useState<TxType>("expense");
  const [keywords, setKeywords] = useState("");

  const save = () => {
    if (!name.trim()) return;
    addCategory({
      name: name.trim(),
      icon,
      kind,
      keywords: keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
    });
    setName("");
    setKeywords("");
    setOpen(false);
  };

  const Section = ({ kind, title }: { kind: TxType; title: string }) => (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-inkSoft">
        {title}
      </h2>
      <ul className="divide-y divide-ink/10 rounded-xl border border-ink/15 bg-white/40">
        {categories
          .filter((c) => c.kind === kind)
          .map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <CategoryIcon name={c.icon} className="h-5 w-5 text-inkSoft" />
              <span className="flex-1">{c.name}</span>
              {c.keywords.length > 0 && (
                <span className="max-w-[45%] truncate text-xs text-inkSoft">
                  {c.keywords.slice(0, 4).join(", ")}
                  {c.keywords.length > 4 ? "…" : ""}
                </span>
              )}
            </li>
          ))}
      </ul>
    </section>
  );

  return (
    <div className="paper-bg min-h-dvh px-4 pt-5 text-ink">
      <h1 className="mb-4 text-xl font-bold">Catégories</h1>
      <p className="mb-4 text-sm text-inkSoft">
        Les mots-clés alimentent l&apos;ajout magique : ils servent à deviner la
        catégorie d&apos;un article saisi en vrac.
      </p>

      <Section kind="expense" title="Dépenses" />
      <Section kind="income" title="Revenus" />

      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/30 py-3 font-medium text-inkSoft transition hover:border-ink/60 hover:text-ink"
      >
        <Plus className="h-4 w-4" /> Nouvelle catégorie
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5">
              <span className={cn(kind === "expense" ? "text-brickDeep" : "text-inkSoft")}>
                Dépense
              </span>
              <Switch
                checked={kind === "income"}
                onCheckedChange={(v) => setKind(v ? "income" : "expense")}
                aria-label="Type de catégorie"
              />
              <span className={cn(kind === "income" ? "text-green-700" : "text-inkSoft")}>
                Revenu
              </span>
            </div>

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
              Créer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
