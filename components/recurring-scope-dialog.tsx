"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RecurringScope } from "@/lib/types";

/**
 * Demande la portée d'une action sur une transaction récurrente :
 * cette occurrence seulement / ce mois et les suivants / toute la série.
 */
export function RecurringScopeDialog({
  open,
  action,
  onChoose,
  onCancel
}: {
  open: boolean;
  action: "save" | "delete";
  onChoose: (scope: RecurringScope) => void;
  onCancel: () => void;
}) {
  const options: { scope: RecurringScope; label: string }[] = [
    { scope: "one", label: "Cette occurrence seulement" },
    { scope: "future", label: "Ce mois et les suivants" },
    { scope: "all", label: "Toute la série" }
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogTitle>Transaction récurrente</DialogTitle>
        <p className="mb-4 text-sm text-inkSoft">
          Cette transaction se répète chaque mois.{" "}
          {action === "delete"
            ? "Que voulez-vous supprimer ?"
            : "À quoi appliquer les modifications ?"}
        </p>
        <div className="space-y-2">
          {options.map(({ scope, label }) => (
            <button
              key={scope}
              onClick={() => onChoose(scope)}
              className="w-full rounded-lg border border-ink/20 bg-white/60 py-2.5 font-medium text-ink transition hover:border-ink/50"
            >
              {label}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="w-full rounded-lg py-2.5 text-sm text-inkSoft transition hover:text-ink"
          >
            Annuler
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
