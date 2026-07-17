"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Check } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { useBudget } from "@/lib/store";
import { TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  type: TxType;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * Page de sélection de catégorie plein écran (par-dessus le formulaire
 * d'ajout). Implémentée en Dialog Radix : les dialogs imbriqués s'empilent
 * proprement, seule la couche du dessus réagit aux interactions extérieures.
 */
export function CategoryPicker({ open, type, selectedId, onSelect, onClose }: Props) {
  const { categories } = useBudget();
  const list = categories.filter((c) => c.kind === type);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="paper-bg fixed inset-0 z-[60] overflow-y-auto text-ink focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="mx-auto min-h-dvh max-w-app px-4 pb-10 pt-5">
            <header className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Retour"
                className="-ml-2 rounded-full p-2 text-inkSoft transition hover:bg-ink/10 hover:text-ink"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <DialogPrimitive.Title className="text-xl font-bold">
                Choisir une catégorie
              </DialogPrimitive.Title>
            </header>

            <ul className="divide-y divide-ink/10 rounded-xl border border-ink/15 bg-white/40">
              {list.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition",
                        active ? "bg-ink/5 font-bold" : "hover:bg-ink/5"
                      )}
                    >
                      <CategoryIcon name={c.icon} className="h-5 w-5 shrink-0 text-inkSoft" />
                      <span className="flex-1">{c.name}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {list.length === 0 && (
              <p className="mt-4 text-sm text-inkSoft">
                Aucune catégorie de ce type — créez-en une dans l&apos;onglet
                Catégories.
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}