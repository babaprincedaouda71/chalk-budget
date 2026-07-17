"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Category, Transaction } from "./types";
import { DEFAULT_CATEGORIES } from "./categories";

/**
 * Persistance : localStorage (côté navigateur uniquement).
 * Pour une vraie base multi-appareils, remplacer load/save par des appels
 * à une API (ex. Vercel Postgres, Supabase) — l'interface du store ne change pas.
 */

interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}

interface BudgetContextValue extends BudgetState {
  ready: boolean;
  month: { year: number; month: number }; // month : 0-11
  setMonth: (m: { year: number; month: number }) => void;
  addTransactions: (tx: Omit<Transaction, "id">[]) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: Omit<Category, "id">) => void;
  setCurrency: (c: string) => void;
  resetAll: () => void;
  monthTransactions: Transaction[];
  totals: { income: number; expense: number; balance: number };
  expenseByCategory: { category: Category; total: number }[];
}

const STORAGE_KEY = "chalk-budget-v1";
const BudgetContext = createContext<BudgetContextValue | null>(null);

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [state, setState] = useState<BudgetState>({
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    currency: "€"
  });

  // Chargement initial
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as BudgetState;
        setState({
          transactions: saved.transactions ?? [],
          categories: saved.categories?.length ? saved.categories : DEFAULT_CATEGORIES,
          currency: saved.currency ?? "€"
        });
      }
    } catch {
      /* stockage corrompu → état par défaut */
    }
    setReady(true);
  }, []);

  // Sauvegarde à chaque changement
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const addTransactions = useCallback((txs: Omit<Transaction, "id">[]) => {
    setState((s) => ({
      ...s,
      transactions: [...s.transactions, ...txs.map((t) => ({ ...t, id: uid() }))]
    }));
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t))
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id)
    }));
  }, []);

  const addCategory = useCallback((c: Omit<Category, "id">) => {
    const id = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid().slice(0, 4);
    setState((s) => ({ ...s, categories: [...s.categories, { ...c, id }] }));
  }, []);

  const setCurrency = useCallback(
    (currency: string) => setState((s) => ({ ...s, currency })),
    []
  );

  const resetAll = useCallback(() => {
    setState({ transactions: [], categories: DEFAULT_CATEGORIES, currency: "€" });
  }, []);

  /**
   * Transactions "effectives" du mois affiché :
   * - transactions datées de ce mois ;
   * - transactions récurrentes créées un mois antérieur (répétées chaque mois).
   */
  const monthTransactions = useMemo(() => {
    const { year, month: m } = month;
    return state.transactions
      .filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        const sameMonth = d.getFullYear() === year && d.getMonth() === m;
        if (sameMonth) return true;
        if (t.recurring) {
          // récurrente : active pour tout mois >= mois d'origine
          return d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < m);
        }
        return false;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, month]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTransactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [monthTransactions]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTransactions) {
      if (t.type !== "expense") continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([id, total]) => ({
        category:
          state.categories.find((c) => c.id === id) ??
          ({ id, name: id, icon: "CircleDashed", kind: "expense", keywords: [] } as Category),
        total
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthTransactions, state.categories]);

  const value: BudgetContextValue = {
    ...state,
    ready,
    month,
    setMonth,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    addCategory,
    setCurrency,
    resetAll,
    monthTransactions,
    totals,
    expenseByCategory
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget doit être utilisé dans <BudgetProvider>");
  return ctx;
}

export const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export function formatAmount(n: number, currency: string) {
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) +
    " " +
    currency
  );
}
