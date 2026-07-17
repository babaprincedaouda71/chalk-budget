"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Category, Transaction } from "./types";
import { DEFAULT_CATEGORIES } from "./categories";

/**
 * Persistance : localStorage (source primaire, hors ligne d'abord) +
 * synchronisation multi-appareils optionnelle via /api/sync.
 *
 * Sync : l'utilisateur saisit un code secret dans Paramètres ; l'état complet
 * est poussé (avec un léger différé) après chaque modification et récupéré à
 * l'ouverture. Conflits : "dernier écrit gagne" (horodatage updatedAt).
 * Sans code — ou si le serveur n'a pas de base configurée — l'app reste
 * 100 % locale : la sync ne doit jamais être requise pour fonctionner.
 */

interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}

export type SyncStatus = "off" | "syncing" | "ok" | "error" | "unavailable";

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
  syncCode: string | null;
  syncStatus: SyncStatus;
  enableSync: (code: string) => Promise<void>;
  disableSync: () => void;
}

const STORAGE_KEY = "chalk-budget-v1";
const SYNC_CODE_KEY = "chalk-budget-sync-code";
const PUSH_DEBOUNCE_MS = 1500;
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
  const [syncCode, setSyncCodeState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("off");

  // Horodatage de la dernière modification locale (persisté avec l'état).
  const updatedAtRef = useRef(0);
  // true pendant l'application d'un état distant : évite de le re-pousser
  // avec un nouvel horodatage (ping-pong entre appareils).
  const applyingRemoteRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyRemote = useCallback((data: {
    updatedAt: number;
    transactions: Transaction[];
    categories: Category[];
    currency: string;
  }) => {
    applyingRemoteRef.current = true;
    updatedAtRef.current = data.updatedAt;
    setState({
      transactions: data.transactions ?? [],
      categories: data.categories?.length ? data.categories : DEFAULT_CATEGORIES,
      currency: data.currency ?? "€"
    });
  }, []);

  /** Récupère l'état distant ; l'applique s'il est plus récent que le local. */
  const pullRemote = useCallback(
    async (code: string) => {
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          headers: { "x-sync-code": code },
          cache: "no-store"
        });
        if (res.status === 503) {
          setSyncStatus("unavailable");
          return;
        }
        if (!res.ok) throw new Error(`sync HTTP ${res.status}`);
        const { data } = await res.json();
        if (data && data.updatedAt > updatedAtRef.current) {
          applyRemote(data);
        }
        setSyncStatus("ok");
      } catch {
        // Jamais bloquant : les données locales restent la référence.
        setSyncStatus("error");
      }
    },
    [applyRemote]
  );

  const pushRemote = useCallback(async (code: string, snapshot: BudgetState) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-sync-code": code },
        body: JSON.stringify({ ...snapshot, updatedAt: updatedAtRef.current })
      });
      if (res.status === 503) {
        setSyncStatus("unavailable");
        return;
      }
      if (!res.ok) throw new Error(`sync HTTP ${res.status}`);
      setSyncStatus("ok");
    } catch {
      setSyncStatus("error");
    }
  }, []);

  // Chargement initial : localStorage, puis pull distant si un code est défini.
  useEffect(() => {
    let code: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as BudgetState & { updatedAt?: number };
        updatedAtRef.current = saved.updatedAt ?? 0;
        setState({
          transactions: saved.transactions ?? [],
          categories: saved.categories?.length ? saved.categories : DEFAULT_CATEGORIES,
          currency: saved.currency ?? "€"
        });
      }
      code = localStorage.getItem(SYNC_CODE_KEY);
    } catch {
      /* stockage corrompu → état par défaut */
    }
    if (code) {
      setSyncCodeState(code);
      void pullRemote(code);
    }
    setReady(true);
  }, [pullRemote]);

  // Sauvegarde locale à chaque changement + push distant différé.
  useEffect(() => {
    if (!ready) return;
    if (applyingRemoteRef.current) {
      // État venu du serveur : on le persiste localement sans le re-pousser.
      applyingRemoteRef.current = false;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, updatedAt: updatedAtRef.current })
      );
      return;
    }
    updatedAtRef.current = Date.now();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, updatedAt: updatedAtRef.current })
    );
    if (syncCode) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void pushRemote(syncCode, state);
      }, PUSH_DEBOUNCE_MS);
    }
  }, [state, ready, syncCode, pushRemote]);

  const enableSync = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (trimmed.length < 6) throw new Error("Code trop court (6 caractères minimum)");
      localStorage.setItem(SYNC_CODE_KEY, trimmed);
      // Réconciliation immédiate : le plus récent (local ou distant) gagne,
      // puis l'effet de sauvegarde poussera l'état retenu.
      await pullRemote(trimmed);
      setSyncCodeState(trimmed);
    },
    [pullRemote]
  );

  const disableSync = useCallback(() => {
    localStorage.removeItem(SYNC_CODE_KEY);
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    setSyncCodeState(null);
    setSyncStatus("off");
  }, []);

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
    expenseByCategory,
    syncCode,
    syncStatus,
    enableSync,
    disableSync
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
