import { Category, Transaction } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "alimentation-perso",
    name: "Alimentation - Courses Personnelles",
    icon: "ShoppingBasket",
    kind: "expense",
    keywords: [
      "courses", "supermarché", "supermarche", "marché", "marche", "épicerie", "epicerie",
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
      "carburant", "station", "péage", "peage", "parking", "uber", "careem", "billet"
    ]
  },
  {
    id: "internet-telecom",
    name: "Internet et Télécom",
    icon: "Wifi",
    kind: "expense",
    keywords: [
      "internet", "wifi", "forfait", "recharge", "téléphone", "telephone", "mobile",
      "fibre", "sim", "data", "orange", "inwi", "iam"
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
    id: "alimentation-commun",
    name: "Alimentation - Courses en commun",
    icon: "ShoppingCart",
    kind: "expense",
    keywords: ["courses communes", "courses commun", "courses en commun"]
  },
  {
    id: "abonnement",
    name: "Abonnement",
    icon: "Tv",
    kind: "expense",
    keywords: [
      "abonnement", "netflix", "spotify", "canal", "prime", "disney", "icloud", "chatgpt"
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
      "medicament", "analyse", "mutuelle", "sport", "gym", "salle", "fitness"
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
export const CATALOG_VERSION = 2;

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

export function migrateCatalog<
  T extends { transactions: Transaction[]; categories: Category[] }
>(state: T, version: number | undefined): T {
  if ((version ?? 1) >= CATALOG_VERSION) return state;
  const custom = state.categories.filter((c) => !V1_DEFAULT_IDS.has(c.id));
  return {
    ...state,
    categories: [...DEFAULT_CATEGORIES, ...custom],
    transactions: state.transactions.map((t) =>
      V1_ID_MAP[t.categoryId] ? { ...t, categoryId: V1_ID_MAP[t.categoryId] } : t
    )
  };
}