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
import { Category, RecurringScope, Transaction } from "./types";
import {
  CATALOG_VERSION,
  DEFAULT_CATEGORIES,
  FALLBACK_EXPENSE_ID,
  migrateCatalog
} from "./categories";
import { extractLearnableWords, normalizeWord } from "./parser";
import { occurrencesInRange } from "./occurrences";
import { mergeStates, signature, SyncState } from "./merge";
import { round2 } from "./utils";
import {
  MONTH_NAMES,
  Period,
  periodLabel,
  periodRange,
  shiftAnchor
} from "./period";

// Ré-exporté pour compatibilité (anciens imports depuis "@/lib/store").
export { MONTH_NAMES };
export type { Period };

/**
 * Persistance : localStorage (source primaire, hors ligne d'abord) +
 * synchronisation multi-appareils optionnelle via /api/sync.
 *
 * Sync : l'utilisateur saisit un code secret dans Paramètres ; l'état est
 * poussé (avec un léger différé) après chaque modification et fusionné à
 * l'ouverture. Conflits résolus PAR ENTITÉ (merge.ts) : chaque transaction et
 * catégorie a son propre horodatage et un tombstone de suppression — deux
 * appareils qui modifient des entités différentes ne s'écrasent jamais.
 * Sans code — ou si le serveur n'a pas de base configurée — l'app reste
 * 100 % locale : la sync ne doit jamais être requise pour fonctionner.
 */

interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  /** Horodatage du dernier changement de devise (LWW scalaire). */
  currencyUpdatedAt: number;
}

export type SyncStatus = "off" | "syncing" | "ok" | "error" | "unavailable";

interface BudgetContextValue extends BudgetState {
  ready: boolean;
  /** Temporalité affichée, partagée par le dashboard et les transactions. */
  period: Period;
  setPeriod: (p: Period) => void;
  anchor: Date;
  /** Décale la période affichée de ±1 (jour/semaine/mois/année). */
  shiftPeriod: (delta: number) => void;
  /** Bornes [start, end) de la période courante. */
  range: { start: Date; end: Date };
  /** Libellé de la période, pour la pilule centrale des en-têtes. */
  rangeLabel: string;
  addTransactions: (tx: Omit<Transaction, "id">[]) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  /**
   * Modifie une transaction récurrente avec une portée (cette occurrence /
   * ce mois et les suivants / toute la série). `occurrenceDate` = date
   * effective de l'occurrence sur laquelle l'utilisateur a agi.
   */
  updateRecurring: (
    original: Transaction,
    occurrenceDate: string,
    edited: Omit<Transaction, "id">,
    scope: RecurringScope
  ) => void;
  /** Supprime une transaction récurrente avec une portée. */
  deleteRecurring: (
    original: Transaction,
    occurrenceDate: string,
    scope: RecurringScope
  ) => void;
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  /** Import en bloc : nouvelles catégories + transactions (ids générés ici). */
  importBundle: (cats: Category[], txs: Omit<Transaction, "id">[]) => void;
  setCurrency: (c: string) => void;
  resetAll: () => void;
  periodTransactions: Transaction[];
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

/** Mois (yyyy-mm) d'une date yyyy-mm-dd. */
const monthOf = (date: string) => date.slice(0, 7);

/** Mois précédent au format yyyy-mm (ex. "2026-01" → "2025-12"). */
const prevMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Apprentissage local : si la catégorie a changé, ajoute les mots
 * significatifs de la note aux mots-clés de la nouvelle catégorie (max 3,
 * sans doublon avec un mot-clé existant). Renvoie les catégories inchangées
 * si rien à apprendre.
 */
function applyLearning(
  categories: Category[],
  prevCategoryId: string,
  edited: { categoryId: string; note?: string }
): Category[] {
  if (prevCategoryId === edited.categoryId || !edited.note) return categories;
  const taken = new Set(
    categories.flatMap((c) => c.keywords.map((k) => normalizeWord(k)))
  );
  const learned = extractLearnableWords(edited.note)
    .filter((w) => !taken.has(w))
    .slice(0, 3);
  if (!learned.length || !categories.some((c) => c.id === edited.categoryId)) {
    return categories;
  }
  return categories.map((c) =>
    c.id === edited.categoryId
      ? { ...c, keywords: [...c.keywords, ...learned], updatedAt: Date.now() }
      : c
  );
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  // Temporalité partagée : période + date d'ancrage (initialisées au montage).
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const shiftPeriod = useCallback(
    (delta: number) => setAnchor((a) => shiftAnchor(period, a, delta)),
    [period]
  );
  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const rangeLabel = useMemo(() => periodLabel(period, anchor), [period, anchor]);
  const [state, setState] = useState<BudgetState>({
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    currency: "MAD",
    currencyUpdatedAt: 0
  });
  const [syncCode, setSyncCodeState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("off");

  // Miroir de l'état courant pour les callbacks hors cycle de rendu
  // (réconciliation au pull, flush avant mise en arrière-plan).
  const stateRef = useRef(state);
  stateRef.current = state;

  // true pendant l'application d'un état fusionné venu du serveur : évite de le
  // re-pousser aussitôt (ping-pong entre appareils).
  const applyingRemoteRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charge utile persistée/synchronisée. `updatedAt` (niveau bloc) reste requis
  // par la route /api/sync, mais la résolution de conflit se fait par entité.
  const buildPayload = useCallback(
    (snapshot: BudgetState) => ({
      ...snapshot,
      updatedAt: Date.now(),
      catalogVersion: CATALOG_VERSION
    }),
    []
  );

  // Normalise un état reçu (migration du catalogue + devise) en SyncState.
  const normalizeIncoming = useCallback(
    (data: {
      transactions?: Transaction[];
      categories?: Category[];
      currency?: string;
      currencyUpdatedAt?: number;
      catalogVersion?: number;
    }): SyncState => {
      const migrated = migrateCatalog(
        {
          transactions: data.transactions ?? [],
          categories: data.categories?.length ? data.categories : DEFAULT_CATEGORIES,
          currency: data.currency ?? "MAD"
        },
        data.catalogVersion
      );
      return { ...migrated, currencyUpdatedAt: data.currencyUpdatedAt ?? 0 };
    },
    []
  );

  const asState = (m: SyncState): BudgetState => ({
    transactions: m.transactions,
    categories: m.categories.length ? m.categories : DEFAULT_CATEGORIES,
    currency: m.currency,
    currencyUpdatedAt: m.currencyUpdatedAt ?? 0
  });

  // Applique un état distant en le FUSIONNANT avec l'état local courant (jamais
  // d'écrasement). Marqué applyingRemote pour ne pas le re-pousser.
  const applyMerged = useCallback((remote: SyncState) => {
    applyingRemoteRef.current = true;
    setState((prev) => asState(mergeStates(prev, remote)));
  }, []);

  // PUT simple (sans relecture) — utilisé quand on vient déjà de fusionner.
  const putRemote = useCallback(
    async (code: string, snapshot: BudgetState) => {
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-sync-code": code },
          body: JSON.stringify(buildPayload(snapshot))
        });
        if (res.status === 503) return setSyncStatus("unavailable");
        if (!res.ok) return setSyncStatus("error");
        setSyncStatus("ok");
      } catch {
        setSyncStatus("error");
      }
    },
    [buildPayload]
  );

  // Push « lecture-puis-écriture » : relit le distant, fusionne, réécrit, puis
  // applique localement ce que le distant apportait. Empêche d'écraser les
  // modifications concurrentes d'un autre appareil.
  const pushMerge = useCallback(
    async (code: string) => {
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          headers: { "x-sync-code": code },
          cache: "no-store"
        });
        if (res.status === 503) return setSyncStatus("unavailable");
        if (!res.ok) return setSyncStatus("error");
        const { data } = await res.json();
        const local = stateRef.current;
        const remote = data ? normalizeIncoming(data) : null;
        const merged = remote ? mergeStates(local, remote) : local;
        await putRemote(code, asState(merged));
        if (remote && signature(merged) !== signature(local)) applyMerged(remote);
      } catch {
        setSyncStatus("error");
      }
    },
    [normalizeIncoming, putRemote, applyMerged]
  );

  // Réconciliation au démarrage / à l'activation : fusionne le distant avec le
  // local, applique le résultat, et le repousse s'il diffère du distant.
  const pullRemote = useCallback(
    async (code: string, local?: BudgetState) => {
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          headers: { "x-sync-code": code },
          cache: "no-store"
        });
        if (res.status === 503) return setSyncStatus("unavailable");
        if (!res.ok) return setSyncStatus("error");
        const { data } = await res.json();
        const localState = local ?? stateRef.current;
        const remote = data ? normalizeIncoming(data) : null;
        if (!remote) {
          // Rien en distant : publier le local s'il a du contenu.
          if (localState.transactions.length) await putRemote(code, localState);
          else setSyncStatus("ok");
          return;
        }
        const merged = mergeStates(localState, remote);
        if (signature(merged) !== signature(localState)) applyMerged(remote);
        if (signature(merged) !== signature(remote)) await putRemote(code, asState(merged));
        else setSyncStatus("ok");
      } catch {
        // Jamais bloquant : les données locales restent la référence.
        setSyncStatus("error");
      }
    },
    [normalizeIncoming, putRemote, applyMerged]
  );

  // Chargement initial : localStorage, puis réconciliation distante si un code
  // est défini (l'état tout juste chargé est passé explicitement car setState
  // n'a pas encore été appliqué à ce stade).
  useEffect(() => {
    let code: string | null = null;
    let loaded: BudgetState | undefined;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<BudgetState> & {
          catalogVersion?: number;
        };
        const migrated = migrateCatalog(
          {
            transactions: saved.transactions ?? [],
            categories: saved.categories?.length ? saved.categories : DEFAULT_CATEGORIES,
            currency: saved.currency ?? "MAD"
          },
          saved.catalogVersion
        );
        loaded = { ...migrated, currencyUpdatedAt: saved.currencyUpdatedAt ?? 0 };
        if ((saved.catalogVersion ?? 1) < CATALOG_VERSION) {
          // Catalogue migré : persisté tout de suite.
          localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(loaded)));
        }
        setState(loaded);
      }
      code = localStorage.getItem(SYNC_CODE_KEY);
    } catch {
      /* stockage corrompu → état par défaut */
    }
    if (code) {
      setSyncCodeState(code);
      void pullRemote(code, loaded);
    }
    setReady(true);
  }, [pullRemote, buildPayload]);

  // Premier passage de l'effet de sauvegarde après le chargement initial :
  // rien n'a changé par l'utilisateur, on évite un push redondant (le pull de
  // démarrage assure déjà la réconciliation).
  const firstSaveRef = useRef(true);

  // Sauvegarde locale à chaque changement + push distant (fusion) différé.
  useEffect(() => {
    if (!ready) return;
    if (applyingRemoteRef.current) {
      // État issu d'une fusion distante : on le persiste sans le re-pousser.
      applyingRemoteRef.current = false;
      firstSaveRef.current = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(state)));
      return;
    }
    if (firstSaveRef.current) {
      firstSaveRef.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(state)));
    if (syncCode) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void pushMerge(syncCode);
      }, PUSH_DEBOUNCE_MS);
    }
  }, [state, ready, syncCode, pushMerge, buildPayload]);

  // iOS suspend les minuteurs des PWA dès la mise en arrière-plan : si un push
  // différé est en attente au moment où l'app se cache (verrouillage, retour à
  // l'accueil), on l'envoie immédiatement — keepalive pour que la requête
  // survive à la fermeture de la page.
  useEffect(() => {
    if (!syncCode) return;
    const flush = () => {
      if (!pushTimerRef.current) return;
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
      void fetch("/api/sync", {
        method: "PUT",
        keepalive: true,
        headers: { "Content-Type": "application/json", "x-sync-code": syncCode },
        body: JSON.stringify(buildPayload(stateRef.current))
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncCode, buildPayload]);

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
    const now = Date.now();
    setState((s) => ({
      ...s,
      transactions: [
        ...s.transactions,
        ...txs.map((t) => ({ ...t, id: uid(), updatedAt: now }))
      ]
    }));
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    // Apprentissage local : corriger la catégorie d'une transaction ajoute
    // les mots significatifs de sa note aux mots-clés de la catégorie choisie
    // — l'ajout magique s'améliore à chaque correction.
    setState((s) => {
      const prev = s.transactions.find((t) => t.id === tx.id);
      const stamped = { ...tx, updatedAt: Date.now() };
      return {
        ...s,
        categories: prev ? applyLearning(s.categories, prev.categoryId, tx) : s.categories,
        transactions: s.transactions.map((t) => (t.id === tx.id ? stamped : t))
      };
    });
  }, []);

  // Suppression = tombstone (conservé pour propager la suppression à la fusion).
  const deleteTransaction = useCallback((id: string) => {
    const now = Date.now();
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, deleted: true, updatedAt: now } : t
      )
    }));
  }, []);

  const updateRecurring = useCallback(
    (
      original: Transaction,
      occurrenceDate: string,
      edited: Omit<Transaction, "id">,
      scope: RecurringScope
    ) => {
      setState((s) => {
        const id = original.id;
        const now = Date.now();
        const categories = applyLearning(s.categories, original.categoryId, edited);
        const occMonth = monthOf(occurrenceDate);
        const originMonth = monthOf(original.date);

        // Toute la série (ou édition depuis le mois d'origine) : mise à jour en
        // place. On préserve la date d'origine et les exceptions existantes ;
        // seuls les champs de contenu changent.
        if (scope === "all" || (scope === "future" && occMonth <= originMonth)) {
          const merged: Transaction = {
            ...edited,
            id,
            date: scope === "all" ? original.date : edited.date,
            recurring: edited.recurring,
            recurringUntil: original.recurringUntil,
            excludeMonths: original.excludeMonths,
            updatedAt: now
          };
          return {
            ...s,
            categories,
            transactions: s.transactions.map((t) => (t.id === id ? merged : t))
          };
        }

        // Cette occurrence seulement : on exclut ce mois de la série et on crée
        // une transaction ponctuelle (non récurrente) avec les valeurs saisies.
        if (scope === "one") {
          const standalone: Transaction = {
            ...edited,
            recurring: false,
            id: uid(),
            updatedAt: now
          };
          return {
            ...s,
            categories,
            transactions: [
              ...s.transactions.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      excludeMonths: [...(t.excludeMonths ?? []), occMonth],
                      updatedAt: now
                    }
                  : t
              ),
              standalone
            ]
          };
        }

        // Ce mois et les suivants : on scinde la série. L'ancienne s'arrête au
        // mois précédent, une nouvelle série démarre à ce mois avec les valeurs
        // saisies (les exclusions futures suivent la nouvelle série).
        const until = prevMonthKey(occMonth);
        const origExcl = original.excludeMonths ?? [];
        const moved = origExcl.filter((mk) => mk >= occMonth);
        const newSeries: Transaction = {
          ...edited,
          id: uid(),
          recurring: true,
          updatedAt: now,
          ...(moved.length ? { excludeMonths: moved } : {})
        };
        return {
          ...s,
          categories,
          transactions: [
            ...s.transactions.map((t) =>
              t.id === id
                ? {
                    ...t,
                    recurringUntil: until,
                    excludeMonths: origExcl.filter((mk) => mk < occMonth),
                    updatedAt: now
                  }
                : t
            ),
            newSeries
          ]
        };
      });
    },
    []
  );

  const deleteRecurring = useCallback(
    (original: Transaction, occurrenceDate: string, scope: RecurringScope) => {
      setState((s) => {
        const id = original.id;
        const now = Date.now();
        const occMonth = monthOf(occurrenceDate);
        const originMonth = monthOf(original.date);

        // Toute la série, ou suppression depuis le mois d'origine : tombstone.
        if (scope === "all" || (scope === "future" && occMonth <= originMonth)) {
          return {
            ...s,
            transactions: s.transactions.map((t) =>
              t.id === id ? { ...t, deleted: true, updatedAt: now } : t
            )
          };
        }

        if (scope === "one") {
          return {
            ...s,
            transactions: s.transactions.map((t) =>
              t.id === id
                ? {
                    ...t,
                    excludeMonths: [...(t.excludeMonths ?? []), occMonth],
                    updatedAt: now
                  }
                : t
            )
          };
        }

        // Ce mois et les suivants : la série s'arrête au mois précédent.
        const until = prevMonthKey(occMonth);
        return {
          ...s,
          transactions: s.transactions.map((t) =>
            t.id === id
              ? {
                  ...t,
                  recurringUntil: until,
                  excludeMonths: (t.excludeMonths ?? []).filter((mk) => mk < occMonth),
                  updatedAt: now
                }
              : t
          )
        };
      });
    },
    []
  );

  const addCategory = useCallback((c: Omit<Category, "id">) => {
    const id = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uid().slice(0, 4);
    setState((s) => ({
      ...s,
      categories: [...s.categories, { ...c, id, updatedAt: Date.now() }]
    }));
  }, []);

  const updateCategory = useCallback((cat: Category) => {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) =>
        c.id === cat.id ? { ...cat, updatedAt: Date.now() } : c
      )
    }));
  }, []);

  /**
   * Supprime une catégorie (tombstone) ; ses transactions basculent vers
   * « Divers » si elle existe (même type), sinon vers la première catégorie
   * vivante du même type. La dernière catégorie d'un type ne peut être supprimée.
   */
  const deleteCategory = useCallback((id: string) => {
    setState((s) => {
      const cat = s.categories.find((c) => c.id === id);
      if (!cat || cat.deleted) return s;
      const now = Date.now();
      const live = s.categories.filter((c) => !c.deleted && c.id !== id);
      const substitute =
        live.find((c) => c.id === FALLBACK_EXPENSE_ID && c.kind === cat.kind) ??
        live.find((c) => c.kind === cat.kind);
      if (!substitute) return s;
      return {
        ...s,
        categories: s.categories.map((c) =>
          c.id === id ? { ...c, deleted: true, updatedAt: now } : c
        ),
        transactions: s.transactions.map((t) =>
          t.categoryId === id ? { ...t, categoryId: substitute.id, updatedAt: now } : t
        )
      };
    });
  }, []);

  const importBundle = useCallback(
    (cats: Category[], txs: Omit<Transaction, "id">[]) => {
      const now = Date.now();
      setState((s) => ({
        ...s,
        categories: [
          ...s.categories,
          ...cats
            .filter((c) => !s.categories.some((x) => x.id === c.id))
            .map((c) => ({ ...c, updatedAt: now }))
        ],
        transactions: [
          ...s.transactions,
          ...txs.map((t) => ({ ...t, id: uid(), updatedAt: now }))
        ]
      }));
    },
    []
  );

  const setCurrency = useCallback(
    (currency: string) =>
      setState((s) => ({ ...s, currency, currencyUpdatedAt: Date.now() })),
    []
  );

  // « Tout effacer » : tombstone toutes les transactions (se propage par entité
  // à la fusion). Les catégories et la devise sont conservées.
  const resetAll = useCallback(() => {
    const now = Date.now();
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.deleted ? t : { ...t, deleted: true, updatedAt: now }
      )
    }));
  }, []);

  // Vues "vivantes" : hors tombstones (les entités supprimées restent dans
  // `state` pour la fusion mais ne doivent jamais être affichées ni comptées).
  const liveTransactions = useMemo(
    () => state.transactions.filter((t) => !t.deleted),
    [state.transactions]
  );
  const liveCategories = useMemo(
    () => state.categories.filter((c) => !c.deleted),
    [state.categories]
  );

  /**
   * Transactions "effectives" de la période affichée (mêmes règles que la page
   * Transactions, via occurrencesInRange : une occurrence par récurrente
   * active, exclusions et fin de série respectées).
   */
  const periodTransactions = useMemo(() => {
    return occurrencesInRange(liveTransactions, range.start, range.end)
      .map((o) => o.tx)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [liveTransactions, range]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of periodTransactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    income = round2(income);
    expense = round2(expense);
    return { income, expense, balance: round2(income - expense) };
  }, [periodTransactions]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.type !== "expense") continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([id, total]) => ({
        category:
          liveCategories.find((c) => c.id === id) ??
          ({ id, name: id, icon: "CircleDashed", kind: "expense", keywords: [] } as Category),
        total: round2(total)
      }))
      .sort((a, b) => b.total - a.total);
  }, [periodTransactions, liveCategories]);

  const value: BudgetContextValue = {
    ...state,
    transactions: liveTransactions,
    categories: liveCategories,
    ready,
    period,
    setPeriod,
    anchor,
    shiftPeriod,
    range,
    rangeLabel,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    updateRecurring,
    deleteRecurring,
    addCategory,
    updateCategory,
    deleteCategory,
    importBundle,
    setCurrency,
    resetAll,
    periodTransactions,
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

export function formatAmount(n: number, currency: string) {
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) +
    " " +
    currency
  );
}
