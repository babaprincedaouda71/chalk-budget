"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { formatAmount, useBudget } from "@/lib/store";
import { budgetLevel, monthSpendingByCategory } from "@/lib/budget";
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
  const { categories, transactions, currency, addTransactions } = useBudget();
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<{
    items: ParsedItem[];
    leftover: string;
    /** Budgets que cet ajout fait passer en alerte ou en dépassement. */
    budgetAlerts?: { text: string; over: boolean }[];
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

    // Alertes budget : comparées sur le mois courant, avant/après l'ajout ;
    // on ne prévient que si l'ajout change le niveau (ok → alerte → dépassé).
    const spending = monthSpendingByCategory(transactions, new Date());
    const added = new Map<string, number>();
    for (const i of items) {
      if (i.type === "expense") added.set(i.categoryId, (added.get(i.categoryId) ?? 0) + i.amount);
    }
    const budgetAlerts: { text: string; over: boolean }[] = [];
    for (const [id, amount] of added) {
      const cat = categories.find((c) => c.id === id);
      if (!cat?.budget) continue;
      const before = spending.get(id) ?? 0;
      const after = before + amount;
      const level = budgetLevel(after, cat.budget);
      if (level === "ok" || level === budgetLevel(before, cat.budget)) continue;
      const amounts = `${formatAmount(after, currency)} / ${formatAmount(cat.budget, currency)}`;
      budgetAlerts.push(
        level === "over"
          ? { text: `Budget « ${cat.name} » dépassé : ${amounts}`, over: true }
          : {
              text: `Budget « ${cat.name} » à ${Math.round((after / cat.budget) * 100)} % : ${amounts}`,
              over: false
            }
      );
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
    setFeedback({ items, leftover: leftoverWords(value), budgetAlerts });
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
              {feedback.budgetAlerts?.map((a) => (
                <p
                  key={a.text}
                  className={`mt-1 font-medium ${a.over ? "text-brickDeep" : "text-amberDeep"}`}
                >
                  {a.text}
                </p>
              ))}
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
