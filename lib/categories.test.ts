import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, migrateCatalog } from "./categories";
import type { Category, Transaction } from "./types";
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

  it("« facture internet » va en Abonnements & Télécom", () => {
    expect(parseLocally("facture internet 300", DEFAULT_CATEGORIES)[0].categoryId).toBe(
      "abonnement"
    );
  });
});

describe("migrateCatalog V5 → V6 (fusions)", () => {
  const cat = (c: Partial<Category> & { id: string }): Category => ({
    name: c.id, icon: "Tv", kind: "expense", keywords: [], ...c
  });
  const tx = (id: string, categoryId: string): Transaction => ({
    id, type: "expense", amount: 10, date: "2026-10-01", categoryId, note: "", updatedAt: 5
  } as Transaction);
  const v5 = () => ({
    categories: [
      cat({ id: "alimentation-perso", name: "Alimentation - Courses Personnelles", keywords: ["pain"] }),
      cat({ id: "alimentation-commun", name: "Alimentation - Courses en commun", keywords: ["courses communes", "kefta"], budget: 800 }),
      cat({ id: "abonnement", name: "Abonnement", keywords: ["netflix"], updatedAt: 3 }),
      cat({ id: "internet-telecom", name: "Mon internet", keywords: ["inwi"] })
    ],
    transactions: [tx("a", "alimentation-commun"), tx("b", "internet-telecom"), tx("c", "abonnement")]
  });

  it("fusionne, renomme et rattache les transactions", () => {
    const out = migrateCatalog(v5(), 5);
    expect(out.categories.map((c) => c.id)).toEqual(["alimentation-perso", "abonnement"]);
    const alim = out.categories[0];
    expect(alim.name).toBe("Alimentation");
    expect(alim.keywords).toEqual(["pain", "courses communes", "kefta"]);
    expect(alim.budget).toBe(800);
    const abo = out.categories[1];
    expect(abo.name).toBe("Abonnements & Télécom");
    expect(abo.keywords).toEqual(["netflix", "inwi"]);
    expect(abo.updatedAt).toBe(3);
    expect(out.transactions.map((t) => t.categoryId)).toEqual([
      "alimentation-perso", "abonnement", "abonnement"
    ]);
    // Horodatages inchangés : pas d'écrasement de modifications plus récentes.
    expect(out.transactions.every((t) => t.updatedAt === 5)).toBe(true);
  });

  it("est idempotent et s'applique aussi à un état déjà en V6", () => {
    const once = migrateCatalog(v5(), 5);
    // Un appareil resté en V5 renvoie la catégorie absorbée : elle est refusionnée.
    const again = migrateCatalog(
      { ...once, categories: [...once.categories, v5().categories[1]] },
      6
    );
    expect(again.categories).toEqual(once.categories);
  });

  it("garde un nom personnalisé", () => {
    const s = v5();
    s.categories[2] = cat({ id: "abonnement", name: "Mes abos" });
    expect(migrateCatalog(s, 5).categories[1].name).toBe("Mes abos");
  });

  it("le catalogue par défaut n'a plus les catégories absorbées", () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(ids).not.toContain("alimentation-commun");
    expect(ids).not.toContain("internet-telecom");
  });
});
