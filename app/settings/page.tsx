"use client";

import { useState } from "react";
import { useBudget } from "@/lib/store";
import { cn } from "@/lib/utils";

const CURRENCIES = ["€", "$", "MAD", "£", "CHF", "CAD"];

export default function SettingsPage() {
  const { currency, setCurrency, transactions, resetAll } = useBudget();
  const [confirmReset, setConfirmReset] = useState(false);

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
