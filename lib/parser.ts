import { Category, ParsedItem } from "./types";
import { FALLBACK_EXPENSE_ID } from "./categories";

/**
 * Parseur local déterministe — l'unique moteur de l'« ajout magique »
 * (aucune IA, aucun réseau : tout se passe dans le navigateur).
 *
 * Principe : on découpe la chaîne en jetons ; chaque nombre rencontré clôt
 * un "ticket" dont la note est constituée des mots accumulés depuis le
 * ticket précédent. Ex : "tomates, oignons 50, tondeuse 182" →
 *   { note: "tomates oignons", amount: 50 }
 *   { note: "tondeuse", amount: 182 }
 *
 * Robustesse aux maladresses de saisie :
 * - accents et casse ignorés pour la correspondance (« the » ≠ thé pour
 *   autant : la comparaison se fait mot à mot, pas par inclusion) ;
 * - fautes de frappe tolérées (distance d'édition 1 dès 5 lettres, 2 dès 8) ;
 * - élisions décollées (« l'hôpital » → hopital) ;
 * - un nombre en tête de ticket est une quantité, pas un prix
 *   (« 2 savons 24 » → un ticket de 24, note « 2 savons ») ;
 * - les mots de devise (« 24 dh ») sont ignorés ;
 * - « taxi30 » ou « 24dh » sont décollés automatiquement.
 */

const NUMBER_RE = /^\d+(?:[.,]\d+)?$/;

const CURRENCY_WORDS = new Set([
  "dh", "dhs", "mad", "fcfa", "cfa", "xof", "eur", "euro", "euros",
  "usd", "chf", "cad", "gbp", "€", "$", "£"
]);

const STOPWORDS = new Set([
  "les", "des", "une", "un", "le", "la", "de", "du", "pour", "avec", "sans",
  "chez", "vers", "sur", "sous", "dans", "par", "aux", "au", "et", "ou",
  "est", "pas", "ce", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes",
  "son", "sa", "ses", "que", "qui", "the", "and", "for"
]);

/** Minuscules + accents supprimés (pour toute comparaison). */
export const normalizeWord = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** « l'hopital » → « hopital », « d'ecole » → « ecole ». */
const stripElision = (w: string) => w.replace(/^[ldjcmnst]['’]/, "");

/** "taxi30, 24dh" → ["taxi", "30", "24", "dh"] (ponctuation écartée). */
const tokenize = (input: string): string[] =>
  input
    .replace(/(\d)(\p{L})/gu, "$1 $2")
    .replace(/(\p{L})(\d)/gu, "$1 $2")
    .match(/\d+(?:[.,]\d+)?|[\p{L}'’-]+/gu) ?? [];

/** Distance d'édition (Damerau-Levenshtein) — mots courts uniquement. */
function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return dp[a.length][b.length];
}

/** Fautes tolérées selon la longueur du mot-clé. */
const tolerance = (len: number) => (len >= 8 ? 2 : len >= 5 ? 1 : 0);

export function parseLocally(input: string, categories: Category[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const tokens = tokenize(input);
  let words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (NUMBER_RE.test(tok)) {
      // Nombre en tête de ticket suivi d'autres jetons : c'est une quantité.
      if (words.length === 0 && i < tokens.length - 1) {
        words.push(tok);
        continue;
      }
      const amount = parseFloat(tok.replace(",", "."));
      if (amount > 0) items.push(buildItem(words, amount, categories));
      words = [];
    } else if (!CURRENCY_WORDS.has(normalizeWord(tok))) {
      words.push(tok);
    }
  }
  // Mots restants sans montant → ignorés (aucun prix identifiable),
  // le composant SmartInput signale ce reste à l'utilisateur.
  return items;
}

function buildItem(words: string[], amount: number, categories: Category[]): ParsedItem {
  const note = words.join(" ").slice(0, 120).trim() || "Sans libellé";
  const matchWords = words
    .map((w) => stripElision(normalizeWord(w)))
    .filter((w) => w && !/\d/.test(w));
  const joined = ` ${matchWords.join(" ")} `;

  let best: Category | null = null;
  let bestScore = 0;
  for (const cat of categories) {
    let score = 0;
    for (const raw of cat.keywords) {
      // Mot-clé normalisé comme le texte : accents, casse et élisions.
      const kw = normalizeWord(raw.trim())
        .split(/\s+/)
        .map(stripElision)
        .join(" ");
      if (!kw) continue;
      if (kw.includes(" ")) {
        // Mot-clé multi-mots : phrase exacte, bornée par des espaces.
        if (joined.includes(` ${kw} `)) score += kw.length * 2;
      } else {
        for (const w of matchWords) {
          if (w === kw) {
            score += kw.length * 2; // exact : poids plein
            break;
          }
          const tol = tolerance(kw.length);
          if (
            tol > 0 &&
            Math.abs(w.length - kw.length) <= tol &&
            editDistance(w, kw) <= tol
          ) {
            score += kw.length; // approché (faute de frappe) : demi-poids
            break;
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  // Secours : « divers » si présente, sinon la première catégorie de dépense —
  // les catégories étant modifiables, l'id de secours peut avoir été supprimé.
  const fallback =
    categories.find((c) => c.id === FALLBACK_EXPENSE_ID) ??
    categories.find((c) => c.kind === "expense");

  return {
    note,
    amount,
    categoryId: best?.id ?? fallback?.id ?? FALLBACK_EXPENSE_ID,
    type: best?.kind ?? "expense"
  };
}

/** Renvoie les mots restés sans montant (pour informer l'utilisateur). */
export function leftoverWords(input: string): string {
  const tokens = tokenize(input);
  let words: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (NUMBER_RE.test(tok)) {
      if (words.length === 0 && i < tokens.length - 1) {
        words.push(tok);
        continue;
      }
      words = [];
    } else if (!CURRENCY_WORDS.has(normalizeWord(tok))) {
      words.push(tok);
    }
  }
  return words.join(" ");
}

/**
 * Mots significatifs d'une note (pour l'apprentissage : quand l'utilisateur
 * corrige la catégorie d'une transaction, ces mots deviennent des mots-clés
 * de la catégorie choisie).
 */
export function extractLearnableWords(note: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of tokenize(note)) {
    const w = stripElision(normalizeWord(tok));
    if (
      w.length >= 3 &&
      !/\d/.test(w) &&
      !STOPWORDS.has(w) &&
      !CURRENCY_WORDS.has(w) &&
      !seen.has(w)
    ) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}
