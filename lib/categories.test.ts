import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, migrateCatalog } from "./categories";
import { parseLocally } from "./parser";

describe("migrateCatalog V4 → V5", () => {
  const v4 = DEFAULT_CATEGORIES.filter((c) => c.id !== "eau-electricite");

  it("ajoute « Eau & Électricité » aux catalogues existants", () => {
    const out = migrateCatalog({ transactions: [], categories: v4 }, 4);
    expect(out.categories.some((c) => c.id === "eau-electricite")).toBe(true);
  });

  it("ne crée pas de doublon si la catégorie existe déjà", () => {
    const out = migrateCatalog({ transactions: [], categories: DEFAULT_CATEGORIES }, 4);
    expect(out.categories.filter((c) => c.id === "eau-electricite")).toHaveLength(1);
  });

  it("ne touche pas un catalogue déjà en V5", () => {
    const out = migrateCatalog({ transactions: [], categories: v4 }, 5);
    expect(out.categories.some((c) => c.id === "eau-electricite")).toBe(false);
  });
});

describe("catégorie Eau & Électricité dans l'ajout magique", () => {
  it.each(["facture eau 250", "électricité 400", "lydec 320", "facture d'eau 180"])(
    "%s → eau-electricite",
    (text) => {
      expect(parseLocally(text, DEFAULT_CATEGORIES)[0].categoryId).toBe("eau-electricite");
    }
  );

  it("« facture internet » reste en Internet et Télécom", () => {
    expect(parseLocally("facture internet 300", DEFAULT_CATEGORIES)[0].categoryId).toBe(
      "internet-telecom"
    );
  });
});
