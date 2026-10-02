import { Category, Transaction } from "./types";
import { toISODate } from "./utils";

/**
 * Sauvegarde complète dans un fichier (Fichiers / iCloud Drive sur iPhone).
 *
 * Le fichier contient l'état brut, comme le blob de synchronisation :
 * transactions et catégories (tombstones compris, avec leurs `updatedAt`),
 * devise. La restauration le FUSIONNE avec l'état courant (lib/merge.ts) :
 * pas de doublon, la version la plus récente de chaque élément l'emporte.
 */

export const BACKUP_APP = "ardoise-budget";
export const BACKUP_FORMAT = 2;

/** Rappel de sauvegarde si la dernière date de plus de 7 jours. */
export const BACKUP_REMINDER_MS = 7 * 24 * 60 * 60 * 1000;
/** « Plus tard » : rappel masqué pendant 3 jours. */
export const BACKUP_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

const LAST_BACKUP_KEY = "chalk-budget-last-backup";
const SNOOZE_KEY = "chalk-budget-backup-snooze";

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  currencyUpdatedAt?: number;
  catalogVersion?: number;
}

/** Fichier de sauvegarde complète (≠ ancien export « transactions seules »). */
export function isBackupFile(data: unknown): data is BackupFile {
  const d = data as Partial<BackupFile> | null;
  return (
    !!d &&
    d.app === BACKUP_APP &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.categories) &&
    typeof d.currency === "string"
  );
}

/**
 * Propose d'enregistrer le fichier : feuille de partage iOS/Android
 * (« Enregistrer dans Fichiers »), sinon téléchargement classique.
 * Renvoie false si l'utilisateur a annulé.
 * Doit être appelée directement depuis un clic (geste utilisateur requis).
 */
export async function saveBackupFile(json: string): Promise<boolean> {
  const name = `ardoise-sauvegarde-${toISODate()}.json`;
  const file = new File([json], name, { type: "application/json" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sauvegarde Ardoise" });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
      throw e;
    }
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  markBackupDone();
  return true;
}

// Préférences locales (pratiques, non critiques) : lectures protégées.
function readNumber(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) || null : null;
  } catch {
    return null;
  }
}
function writeNumber(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    // stockage indisponible : le rappel réapparaîtra, sans gravité
  }
}

export const lastBackupAt = () => readNumber(LAST_BACKUP_KEY);
export const markBackupDone = () => writeNumber(LAST_BACKUP_KEY, Date.now());
export const snoozeBackupReminder = () => writeNumber(SNOOZE_KEY, Date.now() + BACKUP_SNOOZE_MS);

export function backupReminderDue(now = Date.now()): boolean {
  const snoozedUntil = readNumber(SNOOZE_KEY);
  if (snoozedUntil && snoozedUntil > now) return false;
  const last = lastBackupAt();
  return !last || now - last > BACKUP_REMINDER_MS;
}

/** « aujourd'hui », « hier », « il y a 9 jours », ou « jamais ». */
export function formatLastBackup(ts: number | null, now = Date.now()): string {
  if (!ts) return "jamais";
  const days = Math.floor((now - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}
