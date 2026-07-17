import { Category } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "courses",
    name: "Alimentation",
    icon: "ShoppingBasket",
    kind: "expense",
    keywords: [
      "tomate", "tomates", "oignon", "oignons", "pain", "lait", "fromage", "légume",
      "legume", "fruit", "viande", "poulet", "poisson", "riz", "pâtes", "pates",
      "épicerie", "epicerie", "courses", "supermarché", "supermarche", "marché", "marche",
      "oeufs", "œufs", "yaourt", "beurre", "huile", "sucre", "farine", "café", "cafe", "thé", "the"
    ]
  },
  {
    id: "carburant",
    name: "Carburant",
    icon: "Fuel",
    kind: "expense",
    keywords: ["essence", "gasoil", "diesel", "carburant", "station", "plein", "sp95", "sp98"]
  },
  {
    id: "maison",
    name: "Maison / Jardin",
    icon: "Home",
    kind: "expense",
    keywords: [
      "tondeuse", "jardin", "plante", "plantes", "outil", "outils", "perceuse", "bricolage",
      "meuble", "peinture", "ampoule", "ménage", "menage", "lessive", "loyer", "électricité",
      "electricite", "eau", "gaz", "internet", "arrosoir", "terreau", "vis", "marteau"
    ]
  },
  {
    id: "enfants",
    name: "Enfants",
    icon: "Baby",
    kind: "expense",
    keywords: ["école", "ecole", "cantine", "crèche", "creche", "jouet", "jouets", "couches", "fournitures", "nounou"]
  },
  {
    id: "achats",
    name: "Achats",
    icon: "ShoppingBag",
    kind: "expense",
    keywords: ["vêtement", "vetement", "chaussures", "pantalon", "chemise", "téléphone", "telephone", "cadeau", "livre", "amazon"]
  },
  {
    id: "sante",
    name: "Santé",
    icon: "HeartPulse",
    kind: "expense",
    keywords: ["pharmacie", "médecin", "medecin", "docteur", "dentiste", "médicament", "medicament", "mutuelle", "analyse"]
  },
  {
    id: "transport",
    name: "Transport",
    icon: "Bus",
    kind: "expense",
    keywords: ["taxi", "bus", "train", "tram", "métro", "metro", "péage", "peage", "parking", "uber", "billet"]
  },
  {
    id: "resto",
    name: "Restaurants",
    icon: "UtensilsCrossed",
    kind: "expense",
    keywords: ["restaurant", "resto", "pizza", "burger", "sushi", "livraison", "snack", "déjeuner", "dejeuner", "dîner", "diner"]
  },
  {
    id: "loisirs",
    name: "Loisirs",
    icon: "Gamepad2",
    kind: "expense",
    keywords: ["cinéma", "cinema", "jeu", "concert", "sport", "abonnement", "netflix", "spotify", "piscine", "voyage"]
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
    icon: "PiggyBank",
    kind: "income",
    keywords: ["remboursement", "vente", "virement reçu", "cadeau reçu", "loyer perçu"]
  }
];

/** Catégorie de secours quand aucun mot-clé ne correspond */
export const FALLBACK_EXPENSE_ID = "divers";
