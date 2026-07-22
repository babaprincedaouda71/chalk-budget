"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useBudget } from "@/lib/store";
import { leftoverWords, parseLocally } from "@/lib/parser";
import { ParsedItem } from "@/lib/types";
import { toISODate } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

/**
 * "Ajout magique" : l'utilisateur tape par ex. "tomates, oignons 50, tondeuse 182".
 * L'analyse est faite entièrement dans le navigateur par le parseur local
 * déterministe (lib/parser.ts) — aucun appel réseau, fonctionne hors ligne.
 * Les transactions sont ajoutées instantanément au store → la barre de progression
 * et le graphique circulaire se mettent à jour dans la foulée.
 */
export function SmartInput() {
  const { categories, currency, addTransactions } = useBudget();
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<{
    items: ParsedItem[];
    leftover: string;
    error?: string;
  } | null>(null);

  const submit = () => {
    const value = text.trim();
    if (!value) return;

    // Même validation stricte qu'avant : montant positif, catégorie existante,
    // note bornée à 120 caractères (déjà garanti par le parseur).
    const items = parseLocally(value, categories).filter(
      (i) => i.amount > 0 && categories.some((c) => c.id === i.categoryId)
    );

    if (items.length === 0) {
      setFeedback({
        items: [],
        leftover: "",
        error: "Aucun montant détecté. Ajoutez un prix après chaque article, ex. « pain 12 »."
      });
      return;
    }

    const today = toISODate();
    addTransactions(
      items.map((i) => ({
        type: i.type,
        amount: i.amount,
        date: today,
        categoryId: i.categoryId,
        note: i.note
      }))
    );
    setFeedback({ items, leftover: leftoverWords(value) });
    setText("");
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const catIcon = (id: string) =>
    categories.find((c) => c.id === id)?.icon ?? "CircleDashed";

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 rounded-xl border border-ink/15 bg-white/60 px-3 py-2 focus-within:border-ink/40">
        <Sparkles className="h-4 w-4 shrink-0 text-greenDeep" aria-hidden />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ajout magique : tomates, oignons 50, tondeuse 182…"
          aria-label="Saisie rapide en langage naturel"
          className="w-full bg-transparent text-sm text-ink placeholder:text-inkSoft/60 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Envoyer"
          className="rounded-lg bg-ink/10 p-2 text-ink transition hover:bg-ink/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {feedback && (
        <div className="mt-2 rounded-lg border border-ink/10 bg-white/50 p-2 text-xs">
          {feedback.error ? (
            <p className="text-brickDeep">{feedback.error}</p>
          ) : (
            <>
              <p className="mb-1 text-inkSoft">
                {feedback.items.length} transaction{feedback.items.length > 1 ? "s" : ""} ajoutée
                {feedback.items.length > 1 ? "s" : ""} :
              </p>
              <ul className="space-y-1">
                {feedback.items.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-ink">
                    <CategoryIcon name={catIcon(i.categoryId)} className="h-3.5 w-3.5 text-inkSoft" />
                    <span className="flex-1 truncate">
                      {i.note} → {catName(i.categoryId)}
                    </span>
                    <span className={i.type === "income" ? "text-greenDeep" : "text-brickDeep"}>
                      {i.type === "income" ? "+" : "−"}
                      {i.amount} {currency}
                    </span>
                  </li>
                ))}
              </ul>
              {feedback.leftover && (
                <p className="mt-1 text-inkSoft/70">
                  Ignoré (sans prix) : « {feedback.leftover} »
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
