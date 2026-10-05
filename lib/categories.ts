import { Category, Transaction } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "alimentation-perso",
    name: "Alimentation",
    icon: "ShoppingBasket",
    kind: "expense",
    keywords: [
      "courses", "courses communes", "courses commun", "courses en commun", "supermarché", "supermarche", "marché", "marche", "épicerie", "epicerie",
      "tomate", "tomates", "oignon", "oignons", "pain", "lait", "fromage", "légume",
      "legume", "fruit", "viande", "poulet", "poisson", "riz", "pâtes", "pates",
      "oeufs", "œufs", "yaourt", "beurre", "huile", "sucre", "farine", "café", "cafe", "thé", "the"
    ]
  },
  {
    id: "transport",
    name: "Transport",
    icon: "Bus",
    kind: "expense",
    keywords: [
      "taxi", "bus", "train", "tram", "métro", "metro", "essence", "gasoil", "diesel",
      "carburant", "station", "péage", "peage", "parking", "uber", "careem", "indrive",
      "tricycle", "billet"
    ]
  },
  {
    id: "hygiene-beaute",
    name: "Hygiène, Beauté & Bien-être",
    icon: "Sparkles",
    kind: "expense",
    keywords: [
      "savon", "shampoing", "dentifrice", "coiffeur", "hammam", "crème", "creme",
      "parfum", "rasoir", "manucure", "spa", "beauté", "beaute", "hygiène", "hygiene"
    ]
  },
  {
    id: "dettes",
    name: "Dettes",
    icon: "HandCoins",
    kind: "expense",
    keywords: ["dette", "dettes"]
  },
  {
    id: "habillement",
    name: "Habillement",
    icon: "Shirt",
    kind: "expense",
    keywords: [
      "vêtement", "vetement", "vêtements", "vetements", "chaussure", "chaussures",
      "pantalon", "chemise", "robe", "veste", "t-shirt", "tshirt", "jean"
    ]
  },
  {
    id: "produits-menagers",
    name: "Produits Ménagers",
    icon: "SprayCan",
    kind: "expense",
    keywords: [
      "lessive", "javel", "éponge", "eponge", "détergent", "detergent",
      "nettoyant", "ménage", "menage", "produit ménager", "produit menager"
    ]
  },
  {
    id: "abonnement",
    name: "Abonnements & Télécom",
    icon: "Tv",
    kind: "expense",
    keywords: [
      "abonnement", "abonnements", "netflix", "spotify", "canal", "prime", "disney",
      "icloud", "chatgpt", "internet", "wifi", "forfait", "recharge", "téléphone",
      "telephone", "mobile", "fibre", "sim", "data", "orange", "inwi", "iam", "yoxo",
      "abonnement internet"
    ]
  },
  {
    id: "depenses-communes",
    name: "Dépenses Communes",
    icon: "Users",
    kind: "expense",
    keywords: ["commun", "commune", "communes"]
  },
  {
    id: "epargne",
    name: "Épargne",
    icon: "PiggyBank",
    kind: "expense",
    keywords: ["épargne", "epargne", "économies", "economies"]
  },
  {
    id: "prets",
    name: "Prêts",
    icon: "Banknote",
    kind: "expense",
    keywords: ["prêt", "pret", "prêts", "prets", "crédit", "credit", "traite"]
  },
  {
    id: "voyage",
    name: "Voyage",
    icon: "Plane",
    kind: "expense",
    keywords: ["voyage", "vol", "avion", "hôtel", "hotel", "billet avion", "airbnb"]
  },
  {
    id: "famille",
    name: "Famille",
    icon: "Heart",
    kind: "expense",
    keywords: [
      "famille", "école", "ecole", "cantine", "crèche", "creche", "jouet",
      "couches", "nounou", "enfant", "enfants"
    ]
  },
  {
    id: "gift",
    name: "Gift",
    icon: "Gift",
    kind: "expense",
    keywords: ["cadeau", "cadeaux", "gift"]
  },
  {
    id: "investissement",
    name: "Investissement",
    icon: "TrendingUp",
    kind: "expense",
    keywords: ["investissement", "bourse", "action", "actions", "crypto", "bitcoin"]
  },
  {
    id: "sante-sport",
    name: "Santé & Sport",
    icon: "HeartPulse",
    kind: "expense",
    keywords: [
      "pharmacie", "médecin", "medecin", "docteur", "dentiste", "médicament",
      "medicament", "analyse", "mutuelle", "sport", "gym", "salle", "fitness",
      "hopital", "clinique", "examen", "examens", "consultation"
    ]
  },
  {
    id: "eating-out",
    name: "Eating Out",
    icon: "UtensilsCrossed",
    kind: "expense",
    keywords: [
      "restaurant", "resto", "pizza", "burger", "sushi", "snack", "livraison",
      "glovo", "mcdo", "kfc", "déjeuner", "dejeuner", "dîner", "diner"
    ]
  },
  {
    id: "eau-electricite",
    name: "Eau & Électricité",
    icon: "Zap",
    kind: "expense",
    keywords: [
      "eau", "électricité", "electricite", "lumière", "lumiere",
      "courant", "compteur", "lydec", "redal", "amendis",
      "radeema", "onee", "onep", "srm"
    ]
  },
  {
    id: "loyer",
    name: "Loyer",
    icon: "Home",
    kind: "expense",
    keywords: ["loyer"]
  },
  {
    id: "formation",
    name: "Formation",
    icon: "GraduationCap",
    kind: "expense",
    keywords: ["formation", "cours", "livre", "udemy", "coursera", "certification"]
  },
  {
    id: "divers",
    name: "Divers",
    icon: "CircleDashed",
    kind: "expense",
    keywords: []
  },
  {
    id: "salaire",
    name: "Salaire",
    icon: "Wallet",
    kind: "income",
    keywords: ["salaire", "paie", "paye", "prime"]
  },
  {
    id: "bourse-income",
    name: "Bourse",
    icon: "GraduationCap",
    kind: "income",
    keywords: ["bourse reçue", "bourse d'étude", "bourse d'etude", "scholarship"]
  },
  {
    id: "don-income",
    name: "Don",
    icon: "HandHeart",
    kind: "income",
    keywords: ["don", "donation", "don reçu"]
  },
  {
    id: "part-time-job",
    name: "Part Time Job",
    icon: "Briefcase",
    kind: "income",
    keywords: ["part time", "job", "freelance", "mission"]
  },
  {
    id: "autres-revenus",
    name: "Autres revenus",
    icon: "Coins",
    kind: "income",
    keywords: ["remboursement", "vente", "virement reçu", "cadeau reçu", "loyer perçu"]
  }
];

/** Catégorie de secours quand aucun mot-clé ne correspond */
export const FALLBACK_EXPENSE_ID = "divers";

/**
 * Version du catalogue de catégories par défaut, persistée avec l'état
 * (localStorage et blob de sync). Quand un état d'une version antérieure est
 * chargé, `migrateCatalog` remplace les anciennes catégories par défaut par
 * les nouvelles et rattache les transactions aux catégories équivalentes.
 */
export const CATALOG_VERSION = 6;

// Identifiants des catégories par défaut de la V1 (remplacées à la migration ;
// les catégories créées par l'utilisateur sont conservées telles quelles).
const V1_DEFAULT_IDS = new Set([
  "courses", "carburant", "maison", "enfants", "achats", "sante", "transport",
  "resto", "loisirs", "divers", "salaire", "autres-revenus"
]);

// Ancien id → nouvel id pour les transactions existantes.
const V1_ID_MAP: Record<string, string> = {
  courses: "alimentation-perso",
  carburant: "transport",
  maison: "depenses-communes",
  enfants: "famille",
  achats: "habillement",
  sante: "sante-sport",
  resto: "eating-out",
  loisirs: "divers"
};

// Catégories ajoutées en V3 (revenus : Bourse, Don, Part Time Job).
const V3_ADDED_IDS = ["bourse-income", "don-income", "part-time-job"];

// Mots-clés ajoutés en V4 (renfort du parseur local après retrait de l'IA).
const V4_KEYWORD_ADDITIONS: Record<string, string[]> = {
  transport: ["indrive", "tricycle"],
  "internet-telecom": ["yoxo", "abonnement internet"],
  "sante-sport": ["hopital", "clinique", "examen", "examens", "consultation"]
};

// Catégories ajoutées en V5 (factures d'eau et d'électricité).
const V5_ADDED_IDS = ["eau-electricite"];

// Fusions de la V6 : catégorie absorbée → catégorie qui la reçoit, avec les
// noms par défaut à remplacer (un nom personnalisé par l'utilisateur est gardé).
const V6_MERGES: { from: string; into: string }[] = [
  { from: "alimentation-commun", into: "alimentation-perso" },
  { from: "internet-telecom", into: "abonnement" }
];
const V6_RENAMES: Record<string, { old: string; name: string }> = {
  "alimentation-perso": { old: "Alimentation - Courses Personnelles", name: "Alimentation" },
  abonnement: { old: "Abonnement", name: "Abonnements & Télécom" }
};

/**
 * Fusionne les catégories de `V6_MERGES` : mots-clés réunis, budget repris si
 * la cible n'en a pas, transactions rattachées, catégorie absorbée retirée.
 * Idempotent et sans toucher aux `updatedAt` : il est réappliqué à chaque état
 * reçu d'un appareil resté sur une version antérieure, et tous les appareils
 * convergent ainsi vers le même résultat.
 */
function applyV6Merges<T extends { transactions: Transaction[]; categories: Category[] }>(
  state: T
): T {
  let { categories, transactions } = state;
  for (const { from, into } of V6_MERGES) {
    const src = categories.find((c) => c.id === from);
    const dst = categories.find((c) => c.id === into && !c.deleted);
    if (!src || !dst) continue;
    const have = new Set(dst.keywords.map((k) => k.toLowerCase()));
    const merged: Category = {
      ...dst,
      keywords: [
        ...dst.keywords,
        ...(src.deleted ? [] : src.keywords.filter((k) => !have.has(k.toLowerCase())))
      ],
      budget: dst.budget ?? (src.deleted ? undefined : src.budget)
    };
    if (merged.budget === undefined) delete merged.budget;
    categories = categories
      .filter((c) => c.id !== from)
      .map((c) => (c.id === into ? merged : c));
    transactions = transactions.map((t) =>
      t.categoryId === from ? { ...t, categoryId: into } : t
    );
  }
  return { ...state, categories, transactions };
}

export function migrateCatalog<
  T extends { transactions: Transaction[]; categories: Category[] }
>(state: T, version: number | undefined): T {
  let migrated = state;
  const from = version ?? 1;

  if (from < 2) {
    // V1 → V2 : remplacement des catégories par défaut d'origine (celles
    // créées par l'utilisateur sont conservées) et remappage des transactions.
    const custom = migrated.categories.filter((c) => !V1_DEFAULT_IDS.has(c.id));
    migrated = {
      ...migrated,
      categories: [...DEFAULT_CATEGORIES, ...custom],
      transactions: migrated.transactions.map((t) =>
        V1_ID_MAP[t.categoryId] ? { ...t, categoryId: V1_ID_MAP[t.categoryId] } : t
      )
    };
  }

  if (from < 3) {
    // V2 → V3 : ajout des nouvelles catégories par défaut absentes (sans
    // ressusciter celles que l'utilisateur aurait supprimées d'une version
    // ultérieure, d'où la liste explicite des ids ajoutés en V3).
    const existing = new Set(migrated.categories.map((c) => c.id));
    const additions = DEFAULT_CATEGORIES.filter(
      (c) => V3_ADDED_IDS.includes(c.id) && !existing.has(c.id)
    );
    if (additions.length) {
      migrated = { ...migrated, categories: [...migrated.categories, ...additions] };
    }
  }

  if (from < 4) {
    // V3 → V4 : mots-clés supplémentaires pour le parseur local (l'IA a été
    // retirée ; ces termes viennent de l'usage réel de l'utilisateur).
    migrated = {
      ...migrated,
      categories: migrated.categories.map((c) => {
        const extra = V4_KEYWORD_ADDITIONS[c.id];
        if (!extra) return c;
        const have = new Set(c.keywords.map((k) => k.toLowerCase()));
        const fresh = extra.filter((k) => !have.has(k));
        return fresh.length ? { ...c, keywords: [...c.keywords, ...fresh] } : c;
      })
    };
  }

  if (from < 5) {
    // V4 → V5 : ajout de la catégorie « Eau & Électricité » si absente.
    const existing = new Set(migrated.categories.map((c) => c.id));
    const additions = DEFAULT_CATEGORIES.filter(
      (c) => V5_ADDED_IDS.includes(c.id) && !existing.has(c.id)
    );
    if (additions.length) {
      migrated = { ...migrated, categories: [...migrated.categories, ...additions] };
    }
  }

  if (from < 6) {
    // V5 → V6 : renommage des catégories par défaut (si non personnalisées).
    migrated = {
      ...migrated,
      categories: migrated.categories.map((c) => {
        const r = V6_RENAMES[c.id];
        return r && c.name === r.old ? { ...c, name: r.name } : c;
      })
    };
  }

  // Fusions V6, appliquées quelle que soit la version : un appareil encore sur
  // l'ancienne version peut renvoyer les catégories absorbées dans le blob.
  return applyV6Merges(migrated);
}