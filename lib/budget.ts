import { Category, Transaction } from "./types";
import { occurrencesInRange } from "./occurrences";
import { round2 } from "./utils";

/**
 * Budgets mensuels par catégorie de dépense.
 *
 * Le budget est porté par la catégorie (`Category.budget`) : il se synchronise
 * donc comme elle (fusion par entité). Il s'applique toujours à un mois
 * calendaire, quelle que soit la temporalité affichée.
 */

/** Part du budget à partir de laquelle on prévient l'utilisateur. */
export const BUDGET_WARN_RATIO = 0.8;

export type BudgetLevel = "ok" | "warn" | "over";

export interface BudgetStatus {
  category: Category;
  budget: number;
  spent: number;
  /** Positif = reste disponible ; négatif = dépassement. */
  remaining: number;
  /** spent / budget (peut dépasser 1). */
  ratio: number;
  level: BudgetLevel;
}

/** Bornes [start, end) du mois calendaire contenant `d`. */
export function monthRange(d: Date): { start: Date; end: Date } {
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
  };
}

/** Dépenses du mois contenant `month`, cumulées par catégorie (occurrences récurrentes comprises). */
export function monthSpendingByCategory(
  transactions: Transaction[],
  month: Date
): Map<string, number> {
  const { start, end } = monthRange(month);
  const map = new Map<string, number>();
  for (const { tx } of occurrencesInRange(transactions, start, end)) {
    if (tx.type !== "expense") continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
  }
  return map;
}

export function budgetLevel(spent: number, budget: number): BudgetLevel {
  if (spent > budget) return "over";
  if (spent >= budget * BUDGET_WARN_RATIO) return "warn";
  return "ok";
}

/** État de chaque catégorie de dépense ayant un budget, les plus consommés d'abord. */
export function budgetStatuses(
  categories: Category[],
  spending: Map<string, number>
): BudgetStatus[] {
  return categories
    .filter((c) => c.kind === "expense" && (c.budget ?? 0) > 0)
    .map((category) => {
      const budget = category.budget!;
      const spent = round2(spending.get(category.id) ?? 0);
      return {
        category,
        budget,
        spent,
        remaining: round2(budget - spent),
        ratio: spent / budget,
        level: budgetLevel(spent, budget)
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/**
 * Lit un montant de budget saisi par l'utilisateur (« 2 000 », « 1500,50 »).
 * Vide → undefined (pas de budget) ; invalide ou ≤ 0 → null.
 */
export function parseBudgetInput(raw: string): number | undefined | null {
  const cleaned = raw.replace(/[\s  ]/g, "").replace(",", ".");
  if (!cleaned) return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? round2(n) : null;
}
