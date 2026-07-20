import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Date au format yyyy-mm-dd en heure LOCALE (jamais UTC).
 * À utiliser pour toute date de transaction : les dates stockées sont relues
 * en heure locale (`new Date(date + "T00:00:00")`), donc les créer en UTC via
 * `toISOString()` décalerait d'un jour le soir dans certains fuseaux.
 */
export function toISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Arrondi monétaire à 2 décimales — évite qu'une accumulation de flottants
 * (0.1 + 0.2 = 0.30000000000000004) fasse basculer un signe ou un seuil
 * (ex. un solde « − 0 » au lieu de « 0 »).
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
