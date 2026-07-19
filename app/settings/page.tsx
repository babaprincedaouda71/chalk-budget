"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useBudget } from "@/lib/store";
import { ImportResult, parseImportFile } from "@/lib/importer";
import { cn } from "@/lib/utils";

const CURRENCIES = ["€", "$", "MAD", "FCFA", "£", "CHF", "CAD"];

const SYNC_LABELS: Record<string, string> = {
  syncing: "Synchronisation…",
  ok: "Synchronisé ✓",
  error: "Erreur réseau — vos données restent enregistrées sur cet appareil.",
  unavailable: "Indisponible : aucune base de données configurée sur le serveur."
};

export default function SettingsPage() {
  const {
    currency,
    setCurrency,
    transactions,
    categories,
    importBundle,
    resetAll,
    syncCode,
    syncStatus,
    enableSync,
    disableSync
  } = useBudget();
  const [confirmReset, setConfirmReset] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);

  // Import de données (CSV d'une app tierce ou JSON exporté d'ici)
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<(ImportResult & { duplicates: number }) | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState<string | null>(null);

  const txKey = (t: { date: string; amount: number; type: string; note?: string }) =>
    `${t.date}|${t.amount}|${t.type}|${t.note ?? ""}`;

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-choisir le même fichier
    if (!file) return;
    setImportError(null);
    setImportDone(null);
    try {
      const result = parseImportFile(await file.text(), categories);
      const existing = new Set(transactions.map(txKey));
      const fresh = result.transactions.filter((t) => !existing.has(txKey(t)));
      setPreview({
        ...result,
        transactions: fresh,
        duplicates: result.transactions.length - fresh.length
      });
    } catch {
      setImportError(
        "Fichier non reconnu : un export CSV (avec colonnes date et montant) ou JSON est attendu."
      );
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    // Ne crée que les catégories encore référencées après déduplication.
    const usedIds = new Set(preview.transactions.map((t) => t.categoryId));
    importBundle(
      preview.newCategories.filter((c) => usedIds.has(c.id)),
      preview.transactions
    );
    setImportDone(
      `✓ ${preview.transactions.length} transaction${
        preview.transactions.length > 1 ? "s" : ""
      } importée${preview.transactions.length > 1 ? "s" : ""}.`
    );
    setPreview(null);
  };

  const activateSync = async () => {
    setSyncError(null);
    try {
      await enableSync(codeInput);
      setCodeInput("");
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Erreur inattendue");
    }
  };

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), transactions }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ardoise-budget-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="paper-bg flex min-h-0 flex-1 flex-col px-4 pt-5 text-ink">
      {/* Titre fixe ; le contenu défile en dessous */}
      <h1 className="mb-5 text-xl font-bold">Paramètres</h1>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-inkSoft">
          Devise par défaut
        </h2>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              aria-pressed={currency === c}
              className={cn(
                "rounded-lg border px-4 py-2 font-bold transition",
                currency === c
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 bg-white/40 hover:border-ink/50"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-inkSoft">
          Ajout magique
        </h2>
        <div className="rounded-xl border border-ink/15 bg-white/40 p-3 text-sm leading-relaxed">
          <p>
            L&apos;analyse se fait entièrement sur cet appareil, sans IA ni
            connexion : chaque montant clôt un « ticket », et la catégorie est
            devinée grâce aux mots-clés de vos catégories (fautes de frappe et
            accents tolérés).
          </p>
          <p className="mt-2">
            Et ça apprend : quand vous corrigez la catégorie d&apos;une
            transaction, les mots de sa note deviennent des mots-clés de la
            catégorie choisie. Vous pouvez aussi compléter les mots-clés à la
            main dans l&apos;onglet Catégories.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-inkSoft">
          Synchronisation multi-appareils
        </h2>
        <div className="rounded-xl border border-ink/15 bg-white/40 p-3 text-sm leading-relaxed">
          {syncCode ? (
            <>
              <p>
                Activée — vos transactions sont sauvegardées dans le cloud et
                accessibles depuis n&apos;importe quel appareil avec le même
                code secret.
              </p>
              <p className="mt-2 font-medium">
                {SYNC_LABELS[syncStatus] ?? ""}
              </p>
              <button
                onClick={disableSync}
                className="mt-3 w-full rounded-lg border border-ink/25 py-2.5 font-medium transition hover:border-ink/60"
              >
                Désactiver la synchronisation
              </button>
            </>
          ) : (
            <>
              <p>
                Choisissez un code secret (6 caractères minimum) et saisissez le
                même code sur chaque appareil : vos transactions seront
                sauvegardées dans le cloud et synchronisées. Sans code, elles
                restent uniquement sur cet appareil.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="password"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Code secret…"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border border-ink/25 bg-white/60 px-3 py-2.5 text-ink placeholder:text-inkSoft/70 focus:border-ink/60 focus:outline-none"
                />
                <button
                  onClick={activateSync}
                  disabled={codeInput.trim().length < 6 || syncStatus === "syncing"}
                  className="rounded-lg bg-ink px-4 py-2.5 font-bold text-paper transition disabled:opacity-40"
                >
                  Activer
                </button>
              </div>
              {syncError && (
                <p className="mt-2 text-brickDeep">{syncError}</p>
              )}
              {syncStatus === "unavailable" && (
                <p className="mt-2 text-brickDeep">{SYNC_LABELS.unavailable}</p>
              )}
              <p className="mt-2 text-xs text-inkSoft">
                Gardez ce code précieusement : il est la seule clé d&apos;accès à
                vos données synchronisées.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-inkSoft">
          Données
        </h2>
        <p className="mb-3 text-sm text-inkSoft">
          {transactions.length} transaction{transactions.length > 1 ? "s" : ""} —
          stockées localement sur cet appareil (localStorage).
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={exportJson}
            className="rounded-lg border border-ink/25 bg-white/40 py-2.5 font-medium transition hover:border-ink/60"
          >
            Exporter en JSON
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json,text/plain"
            className="hidden"
            onChange={onImportFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-ink/25 bg-white/40 py-2.5 font-medium transition hover:border-ink/60"
          >
            Importer (CSV ou JSON)…
          </button>
          {importError && <p className="text-sm text-brickDeep">{importError}</p>}
          {importDone && <p className="text-sm font-medium text-emerald-600">{importDone}</p>}
          <p className="text-xs text-inkSoft">
            Import : export CSV d&apos;une autre app (Spending Tracker, banque…)
            ou sauvegarde JSON de cette app. Les catégories sont reconnues par
            leur nom ; les manquantes sont créées et les doublons ignorés.
          </p>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="rounded-lg border border-brickDeep/40 py-2.5 font-medium text-brickDeep transition hover:bg-brickDeep/10"
            >
              Tout effacer…
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-lg border border-ink/25 py-2.5"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
                className="flex-1 rounded-lg bg-brickDeep py-2.5 font-bold text-paper"
              >
                Confirmer l&apos;effacement
              </button>
            </div>
          )}
        </div>
      </section>
      </div>

      {/* Aperçu d'import : confirmation avant écriture */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogTitle>Importer des transactions</DialogTitle>
          {preview && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>{preview.transactions.length}</strong> transaction
                {preview.transactions.length > 1 ? "s" : ""} à importer (
                {preview.transactions.filter((t) => t.type === "income").length} revenu
                {preview.transactions.filter((t) => t.type === "income").length > 1 ? "s" : ""},{" "}
                {preview.transactions.filter((t) => t.type === "expense").length} dépense
                {preview.transactions.filter((t) => t.type === "expense").length > 1 ? "s" : ""}
                ).
              </p>
              {preview.duplicates > 0 && (
                <p className="text-inkSoft">
                  {preview.duplicates} doublon{preview.duplicates > 1 ? "s" : ""} ignoré
                  {preview.duplicates > 1 ? "s" : ""} (déjà présent
                  {preview.duplicates > 1 ? "s" : ""}).
                </p>
              )}
              {preview.skipped > 0 && (
                <p className="text-inkSoft">
                  {preview.skipped} ligne{preview.skipped > 1 ? "s" : ""} illisible
                  {preview.skipped > 1 ? "s" : ""} ignorée{preview.skipped > 1 ? "s" : ""}.
                </p>
              )}
              {preview.newCategories.length > 0 && (
                <p>
                  Nouvelles catégories créées :{" "}
                  <span className="text-inkSoft">
                    {preview.newCategories.map((c) => c.name).join(", ")}
                  </span>
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-lg border border-ink/25 py-2.5"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmImport}
                  disabled={preview.transactions.length === 0}
                  className="flex-1 rounded-lg bg-ink py-2.5 font-bold text-paper disabled:opacity-40"
                >
                  Importer
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
