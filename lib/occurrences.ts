import { Transaction } from "./types";
import { toISODate } from "./utils";

/**
 * Une occurrence : la matérialisation d'une transaction à une date effective.
 * Une transaction simple produit une occurrence (sa date) ; une récurrente en
 * produit une par mois depuis son mois d'origine, au même jour du mois
 * (ramené au dernier jour pour les mois plus courts).
 */
export interface Occurrence {
  tx: Transaction;
  /** Date effective de l'occurrence (yyyy-mm-dd) */
  date: string;
  /** Clé stable pour le rendu (id + mois d'occurrence) */
  key: string;
}

/** Occurrences des transactions dont la date effective tombe dans [start, end). */
export function occurrencesInRange(
  transactions: Transaction[],
  start: Date,
  end: Date
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const t of transactions) {
    const origin = new Date(t.date + "T00:00:00");
    if (!t.recurring) {
      if (origin >= start && origin < end) {
        out.push({ tx: t, date: t.date, key: t.id });
      }
      continue;
    }
    // Exceptions : mois sautés et éventuelle fin de série (yyyy-mm inclus).
    const exclude = new Set(t.excludeMonths ?? []);
    const until = t.recurringUntil;

    // Départ : le plus tardif du mois d'origine et du mois de `start`.
    let y = start.getFullYear();
    let m = start.getMonth();
    if (origin > start) {
      y = origin.getFullYear();
      m = origin.getMonth();
    }
    const day = origin.getDate();
    for (;;) {
      const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
      // Comparaison lexicographique valide sur le format yyyy-mm.
      if (until && monthKey > until) break;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const occ = new Date(y, m, Math.min(day, lastDay));
      if (occ >= end) break;
      if (occ >= origin && occ >= start && !exclude.has(monthKey)) {
        out.push({ tx: t, date: toISODate(occ), key: `${t.id}:${monthKey}` });
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }
  return out;
}
