"use client";

import { useEffect, useState } from "react";
import { useBudget } from "@/lib/store";
import {
  backupReminderDue,
  formatLastBackup,
  lastBackupAt,
  saveBackupFile,
  snoozeBackupReminder
} from "@/lib/backup";

/**
 * Rappel de sauvegarde du tableau de bord : affiché quand des transactions
 * existent, que la synchro cloud est désactivée et que la dernière
 * sauvegarde dans Fichiers date de plus de 7 jours (ou n'a jamais eu lieu).
 */
export function BackupReminder() {
  const { ready, transactions, syncCode, exportBackup } = useBudget();
  const [due, setDue] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  // localStorage : lu après le montage (pas de rendu serveur divergent).
  useEffect(() => {
    setDue(backupReminderDue());
    setLast(lastBackupAt());
  }, []);

  if (!ready || !due || syncCode || transactions.length === 0) return null;

  const save = async () => {
    try {
      if (await saveBackupFile(exportBackup())) setDue(false);
    } catch {
      // échec du partage : le rappel reste affiché
    }
  };
  const later = () => {
    snoozeBackupReminder();
    setDue(false);
  };

  return (
    <section
      aria-label="Rappel de sauvegarde"
      className="mx-4 rounded-2xl bg-amberDeep/5 p-4 text-sm ring-1 ring-amberDeep/25"
    >
      <p className="font-medium text-ink">Dernière sauvegarde : {formatLastBackup(last)}</p>
      <p className="mt-1 text-inkSoft">
        Vos données ne sont que sur cet appareil : si vous supprimez l&apos;app,
        elles sont perdues. Enregistrez une sauvegarde dans Fichiers (iCloud Drive).
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={later}
          className="flex-1 rounded-lg border border-ink/25 py-2 font-medium"
        >
          Plus tard
        </button>
        <button
          onClick={save}
          className="flex-1 rounded-lg bg-ink py-2 font-bold text-paper"
        >
          Sauvegarder
        </button>
      </div>
    </section>
  );
}
