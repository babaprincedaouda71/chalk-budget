export type TxType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  icon: string; // nom d'icône lucide-react
  kind: TxType;
  keywords: string[]; // mots-clés pour le Smart Input
  /** Horodatage de dernière modification (fusion multi-appareils par entité). */
  updatedAt?: number;
  /** Tombstone : catégorie supprimée, conservée pour propager la suppression. */
  deleted?: boolean;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  /** ISO yyyy-mm-dd */
  date: string;
  categoryId: string;
  note?: string;
  /** true = se répète tous les mois à partir de sa date */
  recurring?: boolean;
  /** Dernier mois de la série récurrente (yyyy-mm, inclus). Absent = illimitée. */
  recurringUntil?: string;
  /** Mois sautés d'une série récurrente (["yyyy-mm"]). */
  excludeMonths?: string[];
  /** Horodatage de dernière modification (fusion multi-appareils par entité). */
  updatedAt?: number;
  /** Tombstone : transaction supprimée, conservée pour propager la suppression. */
  deleted?: boolean;
}

/**
 * Portée d'une modification/suppression sur une transaction récurrente :
 * cette occurrence seulement / ce mois et les suivants / toute la série.
 */
export type RecurringScope = "one" | "future" | "all";

export interface ParsedItem {
  note: string;
  amount: number;
  categoryId: string;
  type: TxType;
}
