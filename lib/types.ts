export type TxType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  icon: string; // nom d'icône lucide-react
  kind: TxType;
  keywords: string[]; // mots-clés pour le Smart Input
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
}

export interface ParsedItem {
  note: string;
  amount: number;
  categoryId: string;
  type: TxType;
}
