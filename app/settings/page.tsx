"use client";

import { useState } from "react";
import { useBudget } from "@/lib/store";
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
    resetAll,
    syncCode,
    syncStatus,
    enableSync,
    disableSync
  } = useBudget();
  const [confirmReset, setConfirmReset] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);

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
    <div className="paper-bg min-h-dvh px-4 pt-5 text-ink">
      <h1 className="mb-5 text-xl font-bold">Paramètres</h1>

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
          Ajout magique (IA)
        </h2>
        <div className="rounded-xl border border-ink/15 bg-white/40 p-3 text-sm leading-relaxed">
          <p>
            Sans configuration, l&apos;analyse utilise un parseur local par
            mots-clés : il fonctionne hors ligne et sans clé.
          </p>
          <p className="mt-2">
            Pour une analyse par IA plus fine (Google Gemini), définissez la
            variable d&apos;environnement{" "}
            <code className="rounded bg-ink/10 px-1">GEMINI_API_KEY</code> sur
            Vercel (Settings → Environment Variables), puis redéployez. Clé à
            créer sur Google AI Studio ; en local, copiez{" "}
            <code className="rounded bg-ink/10 px-1">.env.local.example</code>{" "}
            en <code className="rounded bg-ink/10 px-1">.env.local</code>.
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
  );
}
