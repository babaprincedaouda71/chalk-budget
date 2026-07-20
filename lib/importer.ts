import { Category, Transaction, TxType } from "./types";
import { FALLBACK_EXPENSE_ID } from "./categories";

/**
 * Import de transactions depuis un fichier tiers :
 * - JSON : l'export de cette app (`{ transactions: [...] }`) ;
 * - CSV : export d'une app tierce (Spending Tracker, banque…) — colonnes
 *   détectées par leurs en-têtes (ou heuristique s'il n'y en a pas), dates et
 *   montants tolérants aux formats français et anglais.
 *
 * Les catégories sont rattachées par nom (insensible à la casse/accents) ;
 * celles qui n'existent pas encore sont créées.
 */

export interface ImportResult {
  transactions: Omit<Transaction, "id">[];
  /** Catégories à créer (référencées par les transactions ci-dessus) */
  newCategories: Category[];
  /** Lignes illisibles ignorées */
  skipped: number;
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/* ---------- Montants ---------- */

/**
 * "MAD 1.000,50", "-60.00", "1 234,5" → nombre (signé) ou null.
 *
 * `euStyle`, déduit au niveau du fichier (voir detectEuStyle), lève
 * l'ambiguïté d'un nombre à points seuls comme "1.500" :
 * true → point = séparateur de milliers → 1500 ;
 * false → point = décimale → 1.5.
 * Sans indice : heuristique locale (groupes de 3 chiffres = milliers).
 */
export function parseImportAmount(raw: string, euStyle?: boolean): number | null {
  let s = raw.replace(/\s/g, "").replace(/[^\d.,+-]/g, "");
  if (!/\d/.test(s)) return null;
  const neg = s.includes("-");
  s = s.replace(/[+-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Les deux séparateurs présents : le plus à droite est la décimale.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // Virgule seule : décimale si ≤ 2 chiffres après, sinon millier ("1,000").
    const decimals = s.length - lastComma - 1;
    s =
      decimals <= 2
        ? s.slice(0, lastComma).replace(/,/g, "") + "." + s.slice(lastComma + 1)
        : s.replace(/,/g, "");
  } else if (lastDot >= 0) {
    // Point seul : ambigu ("1.500" = 1500 ou 1,5 ?). Convention du fichier si
    // connue, sinon heuristique (groupes de 3 chiffres → milliers).
    if (euStyle === true) s = s.replace(/\./g, "");
    else if (euStyle === undefined && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    // euStyle === false → point = décimale : on ne touche à rien.
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

/**
 * Déduit la convention décimale d'un fichier à partir de ses cellules de
 * montant : une virgule suivie de 1-2 chiffres en fin de nombre indique le
 * style européen (virgule décimale) ; un point suivi de 1-2 chiffres, le style
 * anglo (point décimal). Renvoie undefined si indécidable.
 */
function detectEuStyle(cells: string[]): boolean | undefined {
  let eu = 0;
  let us = 0;
  for (const raw of cells) {
    const s = raw.replace(/\s/g, "");
    if (/,\d{1,2}$/.test(s)) eu++;
    else if (/\.\d{1,2}$/.test(s)) us++;
  }
  return eu > us ? true : us > eu ? false : undefined;
}

/* ---------- Dates ---------- */

// Clés normalisées, les plus longues d'abord (juil avant jul, sept avant sep…)
const MONTHS: [string, number][] = [
  ["janv", 0], ["fevr", 1], ["mars", 2], ["avr", 3], ["juin", 5], ["juil", 6],
  ["aout", 7], ["sept", 8], ["jan", 0], ["feb", 1], ["mar", 2], ["apr", 3],
  ["mai", 4], ["may", 4], ["jun", 5], ["jul", 6], ["aug", 7], ["sep", 8],
  ["oct", 9], ["nov", 10], ["dec", 11]
];

function monthIndex(word: string): number | null {
  const w = normalize(word).replace(/\./g, "");
  for (const [key, idx] of MONTHS) {
    if (w.startsWith(key)) return idx;
  }
  return null;
}

const dateFrom = (y: number, m: number, d: number): string | null => {
  if (y < 1970 || y > 2100 || m < 0 || m > 11 || d < 1 || d > 31) return null;
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** "2026-07-18", "18/07/2026", "18 Jul 2026", "Friday, 03 Jul 2026"… → yyyy-mm-dd. */
export function parseImportDate(raw: string): string | null {
  const tryOne = (s: string): string | null => {
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return dateFrom(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
    if (m) {
      let d = +m[1];
      let mo = +m[2];
      const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // format américain évident
      return dateFrom(y, mo - 1, d);
    }
    m = s.match(/^(\d{1,2})(?:er)?\s+([\p{L}.]+),?\s+(\d{4})$/u);
    if (m) {
      const mo = monthIndex(m[2]);
      return mo === null ? null : dateFrom(+m[3], mo, +m[1]);
    }
    m = s.match(/^([\p{L}.]+)\s+(\d{1,2}),?\s+(\d{4})$/u);
    if (m) {
      const mo = monthIndex(m[1]);
      return mo === null ? null : dateFrom(+m[3], mo, +m[2]);
    }
    return null;
  };
  const s = raw.trim();
  // 2ᵉ tentative sans le jour de semaine en tête ("vendredi 3 juillet 2026")
  return tryOne(s) ?? tryOne(s.replace(/^[\p{L}]+[,.]?\s+/u, ""));
}

/* ---------- CSV ---------- */

function detectSeparator(firstLine: string): string {
  const counts: [string, number][] = [";", ",", "\t"].map((sep) => [
    sep,
    firstLine.split(sep).length - 1
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

function parseCsv(text: string): string[][] {
  const sep = detectSeparator(text.slice(0, text.indexOf("\n") + 1 || text.length));
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "jour", "day", "transaction date", "date de transaction"],
  amount: ["montant", "amount", "somme", "valeur", "value", "prix", "total"],
  category: ["categorie", "category", "cat"],
  note: [
    "note", "notes", "description", "memo", "libelle", "label",
    "titre", "title", "detail", "details", "payee"
  ],
  type: ["type", "kind", "sens", "flow"]
};

function findColumn(headers: string[], field: string): number {
  const aliases = HEADER_ALIASES[field];
  return headers.findIndex((h) => aliases.includes(normalize(h)));
}

/* ---------- Import principal ---------- */

export function parseImportFile(
  text: string,
  categories: Category[]
): ImportResult {
  if (/^\s*[[{]/.test(text)) return parseJson(text, categories);
  return parseCsvTransactions(text, categories);
}

function parseJson(text: string, categories: Category[]): ImportResult {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.transactions;
  if (!Array.isArray(arr)) {
    throw new Error("JSON sans tableau de transactions");
  }
  const knownIds = new Set(categories.map((c) => c.id));
  const transactions: Omit<Transaction, "id">[] = [];
  let skipped = 0;
  for (const t of arr) {
    const date = typeof t?.date === "string" ? parseImportDate(t.date) : null;
    const rawAmount =
      typeof t?.amount === "number" ? t.amount : parseImportAmount(String(t?.amount ?? ""));
    if (!date || !rawAmount) {
      skipped++;
      continue;
    }
    transactions.push({
      type: t.type === "income" ? "income" : "expense",
      amount: Math.abs(rawAmount),
      date,
      categoryId: knownIds.has(t.categoryId) ? t.categoryId : FALLBACK_EXPENSE_ID,
      note: typeof t.note === "string" ? t.note.slice(0, 120) : undefined,
      recurring: !!t.recurring,
      ...(typeof t.recurringUntil === "string" ? { recurringUntil: t.recurringUntil } : {}),
      ...(Array.isArray(t.excludeMonths)
        ? { excludeMonths: t.excludeMonths.filter((x: unknown) => typeof x === "string") }
        : {})
    });
  }
  return { transactions, newCategories: [], skipped };
}

function parseCsvTransactions(text: string, categories: Category[]): ImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("CSV vide");

  // Colonnes par en-têtes…
  const headers = rows[0];
  let dateIdx = findColumn(headers, "date");
  let amountIdx = findColumn(headers, "amount");
  let categoryIdx = findColumn(headers, "category");
  let noteIdx = findColumn(headers, "note");
  const typeIdx = findColumn(headers, "type");
  let firstDataRow = 1;

  // …heuristique pour les colonnes MANQUANTES seulement (ne jamais écraser une
  // colonne déjà identifiée par son en-tête).
  if (dateIdx < 0 || amountIdx < 0) {
    const sample = rows.length > 1 ? rows[1] : rows[0];
    if (dateIdx < 0) dateIdx = sample.findIndex((c) => parseImportDate(c) !== null);
    if (amountIdx < 0) {
      // montant : dernière colonne numérique qui n'est pas la date
      for (let i = sample.length - 1; i >= 0; i--) {
        if (i !== dateIdx && parseImportAmount(sample[i]) !== null) {
          amountIdx = i;
          break;
        }
      }
    }
    if (dateIdx < 0 || amountIdx < 0) {
      throw new Error("Colonnes date/montant introuvables");
    }
    const textCols = sample
      .map((_, i) => i)
      .filter(
        (i) =>
          i !== dateIdx &&
          i !== amountIdx &&
          sample[i].trim() !== "" &&
          parseImportAmount(sample[i]) === null
      );
    if (categoryIdx < 0) categoryIdx = textCols[0] ?? -1;
    if (noteIdx < 0) noteIdx = textCols[1] ?? -1;
    // La première ligne est-elle un en-tête (dateIdx illisible) ou des données ?
    firstDataRow = parseImportDate(rows[0][dateIdx] ?? "") ? 0 : 1;
  }

  const dataRows = rows.slice(firstDataRow);

  // Convention décimale déduite du fichier entier (cohérence millier/décimale).
  const euStyle = detectEuStyle(dataRows.map((r) => r[amountIdx] ?? ""));

  // Y a-t-il des montants négatifs ? (si oui : négatif = dépense, positif = revenu)
  const hasNegative = dataRows.some((r) => {
    const n = parseImportAmount(r[amountIdx] ?? "", euStyle);
    return n !== null && n < 0;
  });

  // Résolution des catégories par nom normalisé.
  const byName = new Map<string, Category>();
  for (const c of categories) byName.set(`${c.kind}:${normalize(c.name)}`, c);
  for (const c of categories) {
    const anyKey = normalize(c.name);
    if (!byName.has(anyKey)) byName.set(anyKey, c);
  }
  const created = new Map<string, Category>();

  const transactions: Omit<Transaction, "id">[] = [];
  let skipped = 0;

  for (const r of dataRows) {
    const date = parseImportDate(r[dateIdx] ?? "");
    const rawAmount = parseImportAmount(r[amountIdx] ?? "", euStyle);
    if (!date || !rawAmount) {
      skipped++;
      continue;
    }

    let type: TxType | null = null;
    if (typeIdx >= 0) {
      const v = normalize(r[typeIdx] ?? "");
      if (/income|revenu|credit|entree/.test(v)) type = "income";
      else if (/expense|depense|debit|sortie/.test(v)) type = "expense";
    }
    if (!type) {
      type = rawAmount < 0 ? "expense" : hasNegative ? "income" : "expense";
    }

    let categoryId = FALLBACK_EXPENSE_ID;
    const catName = categoryIdx >= 0 ? (r[categoryIdx] ?? "").trim() : "";
    if (catName) {
      const norm = normalize(catName);
      const match =
        byName.get(`${type}:${norm}`) ?? byName.get(norm) ?? created.get(norm);
      if (match) {
        categoryId = match.id;
        if (match.kind !== type) type = match.kind; // la catégorie fait foi
      } else {
        const fresh: Category = {
          id: norm.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + uid().slice(0, 4),
          name: catName,
          icon: "CircleDashed",
          kind: type,
          keywords: []
        };
        created.set(norm, fresh);
        categoryId = fresh.id;
      }
    }

    const note = noteIdx >= 0 ? (r[noteIdx] ?? "").trim().slice(0, 120) : "";
    transactions.push({
      type,
      amount: Math.abs(rawAmount),
      date,
      categoryId,
      note: note || undefined
    });
  }

  return { transactions, newCategories: [...created.values()], skipped };
}
