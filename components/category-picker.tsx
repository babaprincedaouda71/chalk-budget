"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Check } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { useBudget } from "@/lib/store";
import { TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListProps {
  type: TxType;
  selectedId: string | null;
  /** null = « Toutes les catégories » (proposé si allowAll) */
  onSelect: (id: string | null) => void;
  /** Ajoute une entrée « Toutes les catégories » en tête (mode filtre) */
  allowAll?: boolean;
}

/**
 * Liste de sélection de catégorie, sans chrome de dialogue. À réutiliser
 * DANS un dialogue existant (ex. formulaire de transaction) : ne jamais
 * empiler un second Dialog modal par-dessus un premier — le verrou de
 * défilement du parent (react-remove-scroll) bloque le scroll de tout
 * contenu portalé hors de son sous-arbre.
 */
export function CategoryList({ type, selectedId, onSelect, allowAll = false }: ListProps) {
  const { categories } = useBudget();
  const list = categories.filter((c) => c.kind === type);

  return (
    <>
      <ul className="divide-y divide-ink/10 rounded-xl border border-ink/15 bg-white/40">
        {allowAll && (
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={selectedId === null}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-3 text-left transition",
                selectedId === null ? "bg-ink/5 font-bold" : "hover:bg-ink/5"
              )}
            >
              <CategoryIcon name="CircleDashed" className="h-5 w-5 shrink-0 text-inkSoft" />
              <span className="flex-1">Toutes les catégories</span>
              {selectedId === null && <Check className="h-4 w-4 shrink-0" />}
            </button>
          </li>
        )}
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
    </>
  );
}

interface PickerProps extends ListProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

/**
 * Page de sélection plein écran (Dialog Radix). À n'utiliser QUE hors de tout
 * autre dialogue (ex. filtre de la page Transactions) — pour choisir une
 * catégorie depuis un formulaire déjà en dialogue, utiliser `CategoryList`
 * en échange de contenu dans ce même dialogue.
 */
export function CategoryPicker({
  open,
  type,
  selectedId,
  onSelect,
  onClose,
  allowAll = false,
  title = "Choisir une catégorie"
}: PickerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="paper-bg fixed inset-0 z-[60] overflow-y-auto text-ink focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="mx-auto min-h-dvh max-w-app px-4 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top))]">
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
                {title}
              </DialogPrimitive.Title>
            </header>

            <CategoryList
              type={type}
              selectedId={selectedId}
              onSelect={onSelect}
              allowAll={allowAll}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
