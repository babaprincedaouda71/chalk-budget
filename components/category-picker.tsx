"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft } from "lucide-react";
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
  /** Filtre par nom (insensible à la casse et aux accents). */
  query?: string;
}

/** Normalisation pour la recherche : minuscules, accents retirés. */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Tuile de la grille : icône au-dessus du nom, état sélectionné marqué. */
function CategoryTile({
  icon,
  label,
  active,
  onClick
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition",
        active
          ? "border-ink/60 bg-ink/5 text-ink"
          : "border-ink/15 bg-white/40 text-inkSoft hover:border-ink/40 hover:text-ink"
      )}
    >
      <CategoryIcon name={icon} className="h-6 w-6" />
      <span
        className={cn(
          "w-full truncate text-center text-xs",
          active ? "font-bold" : "font-medium"
        )}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Grille de sélection de catégorie (3 colonnes, icône + nom) : presque toutes
 * les catégories visibles d'un coup, sélection en un tap. Sans chrome de
 * dialogue — à réutiliser DANS un dialogue existant (ex. formulaire de
 * transaction) : ne jamais empiler un second Dialog modal par-dessus un
 * premier — le verrou de défilement du parent (react-remove-scroll) bloque le
 * scroll de tout contenu portalé hors de son sous-arbre.
 */
export function CategoryList({
  type,
  selectedId,
  onSelect,
  allowAll = false,
  query = ""
}: ListProps) {
  const { categories } = useBudget();
  const q = norm(query.trim());
  const ofType = categories.filter((c) => c.kind === type);
  const list = q ? ofType.filter((c) => norm(c.name).includes(q)) : ofType;

  return (
    <>
      <div aria-label="Catégories" className="grid grid-cols-3 gap-2">
        {allowAll && !q && (
          <CategoryTile
            icon="CircleDashed"
            label="Toutes"
            active={selectedId === null}
            onClick={() => onSelect(null)}
          />
        )}
        {list.map((c) => (
          <CategoryTile
            key={c.id}
            icon={c.icon}
            label={c.name}
            active={c.id === selectedId}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>

      {list.length === 0 && (
        <p className="mt-4 text-sm text-inkSoft">
          {q
            ? "Aucune catégorie ne correspond à la recherche."
            : "Aucune catégorie de ce type — créez-en une dans l'onglet Catégories."}
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
