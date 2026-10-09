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
    expect(out.categories.map((c) => c.id)).toEqual([
      "alimentation-perso", "abonnement", "tontine", "tontine-income", "pret-income"
    ]);
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

describe("migrateCatalog V6 → V7 (tontine, prêt reçu)", () => {
  const ids = ["tontine", "tontine-income", "pret-income"];
  const v6 = DEFAULT_CATEGORIES.filter((c) => !ids.includes(c.id));

  it("ajoute « Tontine », « Tontine reçue » et « Prêt reçu » aux catalogues existants", () => {
    const out = migrateCatalog({ transactions: [], categories: v6 }, 6);
    for (const id of ids) {
      expect(out.categories.filter((c) => c.id === id)).toHaveLength(1);
    }
  });

  it("ne touche pas un catalogue déjà en V7", () => {
    const out = migrateCatalog({ transactions: [], categories: v6 }, 7);
    expect(out.categories.some((c) => c.id === "tontine")).toBe(false);
  });
});

describe("catégories Tontine dans l'ajout magique", () => {
  it.each(["tontine 500", "cotisation tontine 1000", "daret 300"])(
    "%s → dépense tontine",
    (text) => {
      const [item] = parseLocally(text, DEFAULT_CATEGORIES);
      expect(item.categoryId).toBe("tontine");
      expect(item.type).toBe("expense");
    }
  );

  it.each(["tontine reçue 6000", "tontine touchée 6000", "daret reçu 3000"])(
    "%s → revenu tontine",
    (text) => {
      const [item] = parseLocally(text, DEFAULT_CATEGORIES);
      expect(item.categoryId).toBe("tontine-income");
      expect(item.type).toBe("income");
    }
  );
});

describe("remboursements et prêts dans l'ajout magique", () => {
  it("complète les mots-clés de Dettes et Prêts sans perdre ceux de l'utilisateur", () => {
    const old = DEFAULT_CATEGORIES.filter((c) => c.id !== "pret-income").map((c) =>
      c.id === "dettes" ? { ...c, keywords: ["dette", "dettes", "ali"] } : c
    );
    const out = migrateCatalog({ transactions: [], categories: old }, 6);
    const dettes = out.categories.find((c) => c.id === "dettes")!;
    expect(dettes.keywords).toContain("ali");
    expect(dettes.keywords).toContain("remboursement de la dette");
    expect(dettes.keywords.filter((k) => k === "dette")).toHaveLength(1);
  });

  it.each([
    ["remboursement dette 500", "dettes", "expense"],
    ["remboursement de la dette 500", "dettes", "expense"],
    ["remboursement de ma dette 500", "dettes", "expense"],
    ["dette 500", "dettes", "expense"],
    ["remboursement prêt 500", "prets", "expense"],
    ["remboursement du crédit 1500", "prets", "expense"],
    ["remboursement emprunt 2000", "prets", "expense"],
    ["traite voiture 2000", "prets", "expense"],
    ["prêt reçu 5000", "pret-income", "income"],
    ["emprunt banque 10000", "pret-income", "income"],
    ["emprunté à Ali 300", "pret-income", "income"],
    ["remboursement mutuelle 300", "autres-revenus", "income"]
  ])("%s → %s", (text, categoryId, type) => {
    const [item] = parseLocally(text, DEFAULT_CATEGORIES);
    expect(item.categoryId).toBe(categoryId);
    expect(item.type).toBe(type);
  });
});
