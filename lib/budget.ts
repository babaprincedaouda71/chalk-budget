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

export interface BudgetAlert {
  category: Category;
  /** Dépenses du mois après l'ajout. */
  spent: number;
  budget: number;
  level: Exclude<BudgetLevel, "ok">;
}

/**
 * Budgets que l'ajout de `added` fait changer de niveau (ok → alerte →
 * dépassé) sur le mois contenant `month`. Rien n'est signalé si le niveau
 * était déjà atteint avant l'ajout : on prévient au franchissement du seuil.
 */
export function budgetAlertsFor(
  transactions: Transaction[],
  categories: Category[],
  added: Pick<Transaction, "type" | "amount" | "categoryId">[],
  month: Date
): BudgetAlert[] {
  const spending = monthSpendingByCategory(transactions, month);
  const sums = new Map<string, number>();
  for (const a of added) {
    if (a.type === "expense") sums.set(a.categoryId, (sums.get(a.categoryId) ?? 0) + a.amount);
  }
  const alerts: BudgetAlert[] = [];
  for (const [id, amount] of sums) {
    const category = categories.find((c) => c.id === id);
    const budget = category?.budget;
    if (!category || !budget) continue;
    const before = spending.get(id) ?? 0;
    const spent = round2(before + amount);
    const level = budgetLevel(spent, budget);
    if (level === "ok" || level === budgetLevel(before, budget)) continue;
    alerts.push({ category, spent, budget, level });
  }
  return alerts;
}

/** Texte d'une alerte, ex. « Budget « Transport » à 85 % : 85 MAD / 100 MAD ». */
export function budgetAlertText(a: BudgetAlert, fmt: (n: number) => string): string {
  const amounts = `${fmt(a.spent)} / ${fmt(a.budget)}`;
  return a.level === "over"
    ? `Budget « ${a.category.name} » dépassé : ${amounts}`
    : `Budget « ${a.category.name} » à ${Math.round((a.spent / a.budget) * 100)} % : ${amounts}`;
}
