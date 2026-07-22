/**
 * Temporalité partagée par le tableau de bord et la page Transactions :
 * une même période (`period` + `anchor`) pilote les deux écrans via le store,
 * de sorte que naviguer sur l'un met l'autre à jour.
 */

export type Period = "day" | "week" | "month" | "year";

export const PERIOD_LABELS: Record<Period, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  year: "Année"
};

export const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

/** Bornes [start, end) de la période contenant `anchor`. */
export function periodRange(period: Period, anchor: Date): { start: Date; end: Date } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  if (period === "day") {
    return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
  }
  if (period === "week") {
    const dow = (anchor.getDay() + 6) % 7; // semaine commençant le lundi
    const start = new Date(y, m, d - dow);
    return {
      start,
      end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    };
  }
  if (period === "year") {
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
}

/** Libellé affiché dans la pilule (ex. « Juillet 2026 », « 2026 », « 14 – 20 juil. 2026 »). */
export function periodLabel(period: Period, anchor: Date): string {
  if (period === "day") {
    return anchor.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
  if (period === "week") {
    const { start, end } = periodRange("week", anchor);
    const endIncl = new Date(end);
    endIncl.setDate(endIncl.getDate() - 1);
    return `${start.getDate()} – ${endIncl.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })}`;
  }
  if (period === "year") return String(anchor.getFullYear());
  return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

/** Nouvel ancrage après un pas de navigation (± une période). */
export function shiftAnchor(period: Period, anchor: Date, delta: number): Date {
  const a = new Date(anchor);
  if (period === "day") a.setDate(a.getDate() + delta);
  else if (period === "week") a.setDate(a.getDate() + 7 * delta);
  else if (period === "year") a.setFullYear(a.getFullYear() + delta);
  else a.setMonth(a.getMonth() + delta, 1);
  return a;
}
