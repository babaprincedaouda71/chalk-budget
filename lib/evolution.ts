import { Transaction } from "./types";
import { occurrencesInRange } from "./occurrences";
import { round2 } from "./utils";

export interface MonthTotals {
  /** Premier jour du mois. */
  month: Date;
  income: number;
  expense: number;
}

/**
 * Revenus et dépenses des `count` mois se terminant par le mois de `end`
 * (occurrences récurrentes comprises), du plus ancien au plus récent.
 */
export function monthlyTotals(
  transactions: Transaction[],
  end: Date,
  count = 12
): MonthTotals[] {
  const first = new Date(end.getFullYear(), end.getMonth() - (count - 1), 1);
  const after = new Date(end.getFullYear(), end.getMonth() + 1, 1);
  const months: MonthTotals[] = Array.from({ length: count }, (_, i) => ({
    month: new Date(first.getFullYear(), first.getMonth() + i, 1),
    income: 0,
    expense: 0
  }));
  for (const { tx, date } of occurrencesInRange(transactions, first, after)) {
    const d = new Date(date + "T00:00:00");
    const i = (d.getFullYear() - first.getFullYear()) * 12 + d.getMonth() - first.getMonth();
    if (i < 0 || i >= count) continue;
    if (tx.type === "income") months[i].income += tx.amount;
    else months[i].expense += tx.amount;
  }
  return months.map((m) => ({ ...m, income: round2(m.income), expense: round2(m.expense) }));
}

/** Plafond « rond » de l'axe (1 ; 1,5 ; 2 ; 2,5 ; 3 ; 4 ; 5 ; 6 ; 8 × 10^k), au moins égal à `max`. */
export function niceCeil(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * pow >= max) return step * pow;
  }
  return 10 * pow;
}
