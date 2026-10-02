import { describe, expect, it } from "vitest";
import { extractLearnableWords, leftoverWords, parseLocally } from "./parser";
import { Category } from "./types";

// Catalogue de test figé (indépendant des catégories par défaut, qui évoluent).
const cat = (id: string, kind: Category["kind"], keywords: string[]): Category => ({
  id,
  name: id,
  icon: "Circle",
  kind,
  keywords
});
const CATS: Category[] = [
  cat("alimentation", "expense", ["tomates", "oignons", "pain", "lait"]),
  cat("transport", "expense", ["taxi", "bus", "essence"]),
  cat("jardin", "expense", ["tondeuse"]),
  cat("hygiene", "expense", ["savon", "savons", "shampooing"]),
  cat("sante", "expense", ["hopital", "pharmacie", "medicaments"]),
  cat("restaurant", "expense", ["pizza", "fast food"]),
  cat("salaire", "income", ["salaire", "prime"]),
  cat("divers", "expense", [])
];

const parse = (s: string) => parseLocally(s, CATS);

describe("parseLocally — découpage en transactions", () => {
  it("chaque nombre clôt une transaction avec les mots qui le précèdent", () => {
    expect(parse("tomates, oignons 50, tondeuse 182")).toEqual([
      { note: "tomates oignons", amount: 50, categoryId: "alimentation", type: "expense" },
      { note: "tondeuse", amount: 182, categoryId: "jardin", type: "expense" }
    ]);
  });

  it("un nombre en tête de transaction est une quantité, pas un prix", () => {
    expect(parse("2 savons 24")).toEqual([
      { note: "2 savons", amount: 24, categoryId: "hygiene", type: "expense" }
    ]);
  });

  it("un nombre seul reste un montant", () => {
    expect(parse("45")).toEqual([
      { note: "Sans libellé", amount: 45, categoryId: "divers", type: "expense" }
    ]);
  });

  it("décolle « taxi30 » et « 24dh », et ignore les mots de devise", () => {
    expect(parse("taxi30")).toMatchObject([{ note: "taxi", amount: 30, categoryId: "transport" }]);
    expect(parse("pain 24dh, lait 8 MAD")).toMatchObject([
      { note: "pain", amount: 24 },
      { note: "lait", amount: 8 }
    ]);
  });

  it("accepte les décimales avec virgule ou point", () => {
    expect(parse("pain 12,5")).toMatchObject([{ amount: 12.5 }]);
    expect(parse("pain 12.5")).toMatchObject([{ amount: 12.5 }]);
  });

  it("ignore un montant nul et les mots sans prix", () => {
    expect(parse("pain 0")).toEqual([]);
    expect(parse("pain 10, oignons")).toMatchObject([{ note: "pain", amount: 10 }]);
  });

  it("borne la note à 120 caractères", () => {
    const [item] = parse(`${"mot ".repeat(50)}10`);
    expect(item.note.length).toBeLessThanOrEqual(120);
  });
});

describe("parseLocally — choix de la catégorie", () => {
  it("ignore la casse et les accents", () => {
    expect(parse("TOMATES 10")[0].categoryId).toBe("alimentation");
    expect(parse("Médicaments 80")[0].categoryId).toBe("sante");
  });

  it("retire les élisions françaises", () => {
    expect(parse("l'hôpital 300")[0].categoryId).toBe("sante");
  });

  it("tolère une faute de frappe dès 5 lettres, deux dès 8", () => {
    expect(parse("tomtes 10")[0].categoryId).toBe("alimentation"); // 1 faute, 7 lettres
    expect(parse("pharmcie 50")[0].categoryId).toBe("sante"); // 1 faute
    expect(parse("medicamnts 50")[0].categoryId).toBe("sante"); // 1 faute, 11 lettres
    expect(parse("tondeues 50")[0].categoryId).toBe("jardin"); // transposition
  });

  it("ne tolère aucune faute sur les mots-clés courts (< 5 lettres)", () => {
    expect(parse("tazi 30")[0].categoryId).toBe("divers");
  });

  it("compare mot à mot, jamais par inclusion", () => {
    // « bus » est inclus dans « autobus » mais n'est pas le même mot.
    expect(parse("autobus 10")[0].categoryId).toBe("divers");
  });

  it("reconnaît un mot-clé de plusieurs mots comme phrase exacte", () => {
    expect(parse("fast food 60")[0].categoryId).toBe("restaurant");
    expect(parse("food fast 60")[0].categoryId).toBe("divers");
  });

  it("donne le type de la catégorie trouvée (revenu)", () => {
    expect(parse("salaire 9000")[0]).toMatchObject({ categoryId: "salaire", type: "income" });
  });

  it("à score égal ou supérieur, la catégorie au plus fort poids l'emporte", () => {
    // « tomates » (7) pèse plus que « bus » (3).
    expect(parse("bus tomates 20")[0].categoryId).toBe("alimentation");
  });

  it("retombe sur la première dépense si « divers » a été supprimée", () => {
    const sansDivers = CATS.filter((c) => c.id !== "divers");
    expect(parseLocally("xyz 10", sansDivers)[0].categoryId).toBe("alimentation");
  });
});

describe("leftoverWords", () => {
  it("renvoie les mots finaux restés sans montant", () => {
    expect(leftoverWords("pain 10, oignons tomates")).toBe("oignons tomates");
  });

  it("renvoie une chaîne vide quand tout a un prix", () => {
    expect(leftoverWords("pain 10, lait 8 dh")).toBe("");
  });
});

describe("extractLearnableWords", () => {
  it("garde les mots significatifs, sans doublons ni mots vides", () => {
    expect(extractLearnableWords("Les croquettes pour le chat, croquettes")).toEqual([
      "croquettes",
      "chat"
    ]);
  });

  it("écarte les nombres, les devises, les mots courts et les élisions", () => {
    expect(extractLearnableWords("2 kg d'épinards 30 dh")).toEqual(["epinards"]);
  });
});
