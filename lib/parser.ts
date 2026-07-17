import { Category, ParsedItem } from "./types";
import { FALLBACK_EXPENSE_ID } from "./categories";

/**
 * Parseur local déterministe (aucune clé API requise).
 *
 * Principe : on découpe la chaîne en jetons ; chaque nombre rencontré clôt
 * un "ticket" dont la note est constituée des mots accumulés depuis le
 * ticket précédent. Ex : "tomates, oignons 50, tondeuse 182" →
 *   { note: "tomates, oignons", amount: 50 }
 *   { note: "tondeuse", amount: 182 }
 *
 * La catégorie est ensuite déduite par correspondance de mots-clés.
 */
export function parseLocally(input: string, categories: Category[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  // jetons : nombres (avec , ou . décimal) ou mots
  const tokens = input.match(/\d+(?:[.,]\d+)?|[^\s,;+]+/g) ?? [];
  let words: string[] = [];

  for (const tok of tokens) {
    if (/^\d+(?:[.,]\d+)?$/.test(tok)) {
      const amount = parseFloat(tok.replace(",", "."));
      if (amount > 0) {
        items.push(buildItem(words, amount, categories));
      }
      words = [];
    } else {
      words.push(tok);
    }
  }
  // Mots restants sans montant → ignorés (aucun prix identifiable),
  // le composant SmartInput signale ce reste à l'utilisateur.
  return items;
}

function buildItem(words: string[], amount: number, categories: Category[]): ParsedItem {
  const note = words.join(", ").replace(/,\s*,/g, ",").trim() || "Sans libellé";
  const lower = words.join(" ").toLowerCase();

  let best: { id: string; kind: "income" | "expense" } | null = null;
  let bestScore = 0;
  for (const cat of categories) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (kw && lower.includes(kw.toLowerCase())) score += kw.length; // mots-clés longs = plus précis
    }
    if (score > bestScore) {
      bestScore = score;
      best = { id: cat.id, kind: cat.kind };
    }
  }

  return {
    note,
    amount,
    categoryId: best?.id ?? FALLBACK_EXPENSE_ID,
    type: best?.kind ?? "expense"
  };
}

/** Renvoie les mots restés sans montant (pour informer l'utilisateur). */
export function leftoverWords(input: string): string {
  const tokens = input.match(/\d+(?:[.,]\d+)?|[^\s,;+]+/g) ?? [];
  const out: string[] = [];
  let words: string[] = [];
  for (const tok of tokens) {
    if (/^\d+(?:[.,]\d+)?$/.test(tok)) words = [];
    else words.push(tok);
  }
  out.push(...words);
  return out.join(" ");
}
