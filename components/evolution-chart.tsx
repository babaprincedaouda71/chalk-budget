"use client";

import { useMemo, useState } from "react";
import { formatAmount, useBudget } from "@/lib/store";
import { MONTH_NAMES } from "@/lib/period";
import { monthlyTotals, niceCeil } from "@/lib/evolution";
import { cn } from "@/lib/utils";

/**
 * Couleurs des barres, validées pour le daltonisme (deutéranopie /
 * protanopie ΔE ≥ 10) : le vert/rose habituel (#059669 / #E11D48) ne
 * passe pas. Le rose est peu contrasté sur fond clair : les montants du
 * mois sélectionné sont donc toujours écrits en texte sous le graphique.
 */
const INCOME = "#047857";
const EXPENSE = "#FB7185";

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1
});

/**
 * Évolution sur 12 mois (jusqu'au mois de la période affichée) : revenus et
 * dépenses par mois. Toucher un mois affiche ses montants ; « Voir ce mois »
 * y positionne le tableau de bord.
 */
export function EvolutionChart() {
  const { ready, transactions, anchor, currency, showMonth } = useBudget();
  const months = useMemo(() => monthlyTotals(transactions, anchor), [transactions, anchor]);
  // Mois sélectionné (horodatage du 1er du mois) ; s'il sort de la fenêtre
  // (navigation de période), on revient au dernier = mois affiché.
  const [selected, setSelected] = useState<number | null>(null);
  const found = months.findIndex((m) => m.month.getTime() === selected);
  const sel = found >= 0 ? found : months.length - 1;

  const max = niceCeil(Math.max(...months.map((m) => Math.max(m.income, m.expense))));
  if (!ready || months.every((m) => m.income === 0 && m.expense === 0)) return null;

  const current = months[sel];
  const balance = current.income - current.expense;
  const label = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  const short = (d: Date) =>
    d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  const isAnchorMonth =
    current.month.getFullYear() === anchor.getFullYear() &&
    current.month.getMonth() === anchor.getMonth();

  return (
    <section
      aria-label="Évolution sur 12 mois"
      className="mx-4 rounded-2xl bg-white/60 p-4 ring-1 ring-ink/10"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-bold">Évolution · 12 mois</h2>
        <span className="text-xs text-inkSoft">
          {short(months[0].month)} – {short(months[months.length - 1].month)}
        </span>
      </div>

      {/* Légende (toujours présente : l'identité ne repose pas sur la couleur seule) */}
      <div className="mb-3 flex gap-4 text-xs text-inkSoft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} />
          Revenus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE }} />
          Dépenses
        </span>
      </div>

      <div className="flex gap-1.5">
        {/* Axe Y : 0, moitié, plafond */}
        <div className="relative h-36 w-8 shrink-0 text-right text-[10px] text-inkSoft">
          {[1, 0.5, 0].map((f) => (
            <span
              key={f}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - f) * 100}%` }}
            >
              {compact.format(max * f)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-36">
            {/* Grille horizontale discrète */}
            {[0, 0.5, 1].map((f) => (
              <div
                key={f}
                aria-hidden
                className="absolute inset-x-0 h-px bg-ink/10"
                style={{ top: `${f * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex">
              {months.map((m, i) => (
                <button
                  key={m.month.getTime()}
                  type="button"
                  onClick={() => setSelected(m.month.getTime())}
                  aria-pressed={i === sel}
                  aria-label={`${label(m.month)} : revenus ${formatAmount(
                    m.income,
                    currency
                  )}, dépenses ${formatAmount(m.expense, currency)}`}
                  className={cn(
                    "flex h-full flex-1 items-end justify-center gap-0.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
                    i === sel && "bg-ink/[0.06]"
                  )}
                >
                  {(["income", "expense"] as const).map((k) => (
                    <span
                      key={k}
                      className="w-[min(10px,35%)] rounded-t-[4px]"
                      style={{
                        height: `${(m[k] / max) * 100}%`,
                        background: k === "income" ? INCOME : EXPENSE
                      }}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
          {/* Initiales des mois */}
          <div className="mt-1 flex text-center text-[10px] text-inkSoft">
            {months.map((m, i) => (
              <span
                key={m.month.getTime()}
                className={cn("flex-1", i === sel && "font-bold text-ink")}
              >
                {MONTH_NAMES[m.month.getMonth()][0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Montants du mois sélectionné, en texte */}
      <div className="mt-3 border-t border-ink/10 pt-3 text-sm">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="font-bold">{label(current.month)}</span>
          {!isAnchorMonth && (
            <button
              type="button"
              onClick={() => {
                showMonth(current.month);
                setSelected(null);
              }}
              className="text-xs font-medium text-ink underline underline-offset-2"
            >
              Voir ce mois
            </button>
          )}
        </div>
        <dl className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} />
            <dt className="flex-1 text-inkSoft">Revenus</dt>
            <dd>{formatAmount(current.income, currency)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE }} />
            <dt className="flex-1 text-inkSoft">Dépenses</dt>
            <dd>{formatAmount(current.expense, currency)}</dd>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2.5" />
            <dt className="flex-1">Solde</dt>
            <dd className={balance >= 0 ? "text-greenDeep" : "text-brickDeep"}>
              {balance >= 0 ? "" : "− "}
              {formatAmount(Math.abs(balance), currency)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
