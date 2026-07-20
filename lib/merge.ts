import { Category, Transaction } from "./types";

/**
 * Fusion multi-appareils par entité (LWW-element-set, style CRDT).
 *
 * Chaque transaction et catégorie porte son propre `updatedAt` et un éventuel
 * tombstone `deleted`. La fusion fait l'UNION par id ; pour un id présent des
 * deux côtés, la version au plus grand `updatedAt` gagne (une suppression est
 * un tombstone qui participe au dernier-écrit-gagne). Résultat : deux appareils
 * qui modifient des entités DIFFÉRENTES ne s'écrasent jamais ; seuls des
 * changements sur la MÊME entité se départagent par horodatage.
 *
 * Ce fichier est pur (aucun accès réseau/DOM) → testable en isolation.
 */

interface Mergeable {
  id: string;
  updatedAt?: number;
  deleted?: boolean;
}

/** Durée de conservation des tombstones avant purge (bornage mémoire). */
export const TOMBSTONE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 jours

export interface SyncState {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  /** Horodatage du dernier changement de devise (LWW scalaire). */
  currencyUpdatedAt?: number;
}

function mergeById<T extends Mergeable>(a: T[], b: T[], now: number): T[] {
  const byId = new Map<string, T>();
  const consider = (item: T) => {
    const cur = byId.get(item.id);
    if (!cur) {
      byId.set(item.id, item);
      return;
    }
    const ct = cur.updatedAt ?? 0;
    const it = item.updatedAt ?? 0;
    // Plus récent gagne ; à égalité, la suppression l'emporte (prudence).
    if (it > ct || (it === ct && item.deleted && !cur.deleted)) {
      byId.set(item.id, item);
    }
  };
  for (const item of a) consider(item);
  for (const item of b) consider(item);

  const out: T[] = [];
  for (const item of byId.values()) {
    // Purge des tombstones anciens (ils ont eu le temps de se propager).
    if (item.deleted && (item.updatedAt ?? 0) < now - TOMBSTONE_TTL_MS) continue;
    out.push(item);
  }
  return out;
}

/** Fusionne deux états complets (transactions + catégories + devise). */
export function mergeStates(a: SyncState, b: SyncState, now = Date.now()): SyncState {
  const aCur = a.currencyUpdatedAt ?? 0;
  const bCur = b.currencyUpdatedAt ?? 0;
  return {
    transactions: mergeById(a.transactions, b.transactions, now),
    categories: mergeById(a.categories, b.categories, now),
    currency: bCur > aCur ? b.currency : a.currency,
    currencyUpdatedAt: Math.max(aCur, bCur)
  };
}

/**
 * Signature compacte d'un état (ids + horodatages + tombstones + devise) pour
 * détecter, sans comparaison profonde, si deux états sont équivalents — sert à
 * décider s'il faut pousser après une fusion.
 */
export function signature(s: SyncState): string {
  const part = (arr: Mergeable[]) =>
    arr
      .map((e) => `${e.id}:${e.updatedAt ?? 0}:${e.deleted ? 1 : 0}`)
      .sort()
      .join(",");
  return `${part(s.transactions)}|${part(s.categories)}|${s.currency}:${
    s.currencyUpdatedAt ?? 0
  }`;
}
