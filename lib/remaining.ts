import { Transaction } from "./types";
import { occurrencesInRange, Occurrence } from "./occurrences";
import { monthRange } from "./budget";
import { round2, toISODate } from "./utils";

/**
 * « Reste à vivre » du mois calendaire en cours : ce qu'il reste à dépenser
 * jusqu'à la fin du mois une fois les dépenses déjà faites et celles déjà
 * prévues (récurrentes ou datées plus tard dans le mois) retirées des revenus
 * du mois (reçus et attendus). Les soldes des mois précédents ne sont pas
 * reportés : l'app ne connaît pas le solde réel du compte.
 */
export interface RemainingToLive {
  /** Revenus du mois, reçus et attendus. */
  income: number;
  /** Part des revenus datée après aujourd'hui. */
  incomeExpected: number;
  /** Dépenses datées jusqu'à aujourd'hui inclus. */
  spent: number;
  /** Dépenses datées après aujourd'hui, de la plus proche à la plus lointaine. */
  upcoming: Occurrence[];
  upcomingTotal: number;
  /** income − spent − upcomingTotal (négatif = dépassement prévu). */
  remaining: number;
  /** Jours restants dans le mois, aujourd'hui compris. */
  daysLeft: number;
  /** remaining / daysLeft, ou 0 si le reste est négatif. */
  perDay: number;
}

export function remainingToLive(transactions: Transaction[], today: Date): RemainingToLive {
  const { start, end } = monthRange(today);
  const todayISO = toISODate(today);
  let income = 0;
  let incomeExpected = 0;
  let spent = 0;
  let upcomingTotal = 0;
  const upcoming: Occurrence[] = [];

  for (const occ of occurrencesInRange(transactions, start, end)) {
    const future = occ.date > todayISO;
    if (occ.tx.type === "income") {
      income += occ.tx.amount;
      if (future) incomeExpected += occ.tx.amount;
    } else if (future) {
      upcoming.push(occ);
      upcomingTotal += occ.tx.amount;
    } else {
      spent += occ.tx.amount;
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  const remaining = round2(income - spent - upcomingTotal);
  const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
  return {
    income: round2(income),
    incomeExpected: round2(incomeExpected),
    spent: round2(spent),
    upcoming,
    upcomingTotal: round2(upcomingTotal),
    remaining,
    daysLeft,
    perDay: remaining > 0 ? round2(remaining / daysLeft) : 0
  };
}
