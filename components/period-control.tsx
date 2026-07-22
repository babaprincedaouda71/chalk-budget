"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useBudget } from "@/lib/store";
import { PERIOD_LABELS, Period } from "@/lib/period";
import { cn } from "@/lib/utils";

const PERIODS = Object.keys(PERIOD_LABELS) as Period[];

/**
 * Pilule centrale « temporalité » (Jour / Semaine / Mois / Année), partagée par
 * le tableau de bord et la page Transactions pour garder une identité unique.
 * L'ouverture peut être contrôlée (`open`/`onOpenChange`) afin de se coordonner
 * avec d'autres menus d'une même page, ou laissée en mode autonome.
 */
export function PeriodPill({
  open,
  onOpenChange
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { period, setPeriod, rangeLabel } = useBudget();
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInternal(v));

  return (
    <div className="relative justify-self-center">
      <button
        onClick={() => setOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="whitespace-nowrap rounded-lg border border-ink/20 bg-white/60 px-4 py-1.5 font-bold text-ink transition hover:border-ink/40"
      >
        {rangeLabel}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute left-1/2 top-full z-50 mt-2 min-w-[12rem] -translate-x-1/2 overflow-hidden rounded-2xl border border-ink/10 bg-paper py-1.5 shadow-xl shadow-ink/10 ring-1 ring-ink/5"
          >
            <p className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-inkSoft">
              Afficher par
            </p>
            {PERIODS.map((p) => (
              <button
                key={p}
                role="menuitem"
                onClick={() => {
                  setPeriod(p);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-ink/5",
                  period === p && "font-bold"
                )}
              >
                <span className="w-4 shrink-0">
                  {period === p && <Check className="h-4 w-4 text-greenDeep" />}
                </span>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Navigation ± une période : chevrons fins « ‹ › », sans fond, centrés. */
export function PeriodNav({ className }: { className?: string }) {
  const { shiftPeriod } = useBudget();
  return (
    <div className={cn("flex items-center justify-center gap-10", className)}>
      <button
        onClick={() => shiftPeriod(-1)}
        aria-label="Période précédente"
        className="text-ink/70 transition hover:text-ink"
      >
        <ChevronLeft className="h-7 w-7" strokeWidth={1.75} />
      </button>
      <button
        onClick={() => shiftPeriod(1)}
        aria-label="Période suivante"
        className="text-ink/70 transition hover:text-ink"
      >
        <ChevronRight className="h-7 w-7" strokeWidth={1.75} />
      </button>
    </div>
  );
}
