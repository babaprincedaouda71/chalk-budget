"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useBudget } from "@/lib/store";
import { leftoverWords } from "@/lib/parser";
import { ParsedItem } from "@/lib/types";
import { CategoryIcon } from "./category-icon";

/**
 * "Ajout magique" : l'utilisateur tape par ex. "tomates, oignons 50, tondeuse 182".
 * Le texte est envoyé à /api/parse qui renvoie des transactions structurées
 * (LLM Gemini si GEMINI_API_KEY est configurée, sinon parseur local déterministe).
 * Les tickets sont ajoutés instantanément au store → la barre de progression
 * et le graphique circulaire se mettent à jour dans la foulée.
 */
export function SmartInput() {
  const { categories, currency, addTransactions } = useBudget();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    items: ParsedItem[];
    leftover: string;
    error?: string;
  } | null>(null);

  const submit = async () => {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, categories })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { items: ParsedItem[] } = await res.json();

      if (data.items.length === 0) {
        setFeedback({
          items: [],
          leftover: "",
          error: "Aucun montant détecté. Ajoutez un prix après chaque article, ex. « pain 12 »."
        });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      addTransactions(
        data.items.map((i) => ({
          type: i.type,
          amount: i.amount,
          date: today,
          categoryId: i.categoryId,
          note: i.note
        }))
      );
      setFeedback({ items: data.items, leftover: leftoverWords(value) });
      setText("");
    } catch {
      setFeedback({
        items: [],
        leftover: "",
        error: "Analyse impossible pour le moment. Réessayez ou utilisez la saisie manuelle."
      });
    } finally {
      setLoading(false);
    }
  };

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const catIcon = (id: string) =>
    categories.find((c) => c.id === id)?.icon ?? "CircleDashed";

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 rounded-xl border border-chalk/20 bg-black/25 px-3 py-2 shadow-inner focus-within:border-chalk/50">
        <Sparkles className="h-4 w-4 shrink-0 text-chalkGreen" aria-hidden />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ajout magique : tomates, oignons 50, tondeuse 182…"
          aria-label="Saisie rapide en langage naturel"
          className="w-full bg-transparent text-sm text-chalk placeholder:text-chalkDim/50 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={loading || !text.trim()}
          aria-label="Envoyer"
          className="rounded-lg bg-chalk/15 p-2 text-chalk transition hover:bg-chalk/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {feedback && (
        <div className="mt-2 rounded-lg border border-chalk/15 bg-black/20 p-2 text-xs">
          {feedback.error ? (
            <p className="chalk-red">{feedback.error}</p>
          ) : (
            <>
              <p className="mb-1 text-chalkDim">
                {feedback.items.length} ticket{feedback.items.length > 1 ? "s" : ""} ajouté
                {feedback.items.length > 1 ? "s" : ""} :
              </p>
              <ul className="space-y-1">
                {feedback.items.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-chalk">
                    <CategoryIcon name={catIcon(i.categoryId)} className="h-3.5 w-3.5 text-chalkDim" />
                    <span className="flex-1 truncate">
                      {i.note} → {catName(i.categoryId)}
                    </span>
                    <span className={i.type === "income" ? "chalk-green" : "chalk-red"}>
                      {i.type === "income" ? "+" : "−"}
                      {i.amount} {currency}
                    </span>
                  </li>
                ))}
              </ul>
              {feedback.leftover && (
                <p className="mt-1 text-chalkDim/70">
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
