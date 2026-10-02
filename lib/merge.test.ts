import { describe, expect, it } from "vitest";
import { mergeStates, signature, SyncState, TOMBSTONE_TTL_MS } from "./merge";
import { Category, Transaction } from "./types";

const NOW = 1_800_000_000_000;
// NB : un tombstone daté de plus de TOMBSTONE_TTL_MS avant NOW est purgé —
// les tests de suppression utilisent donc des horodatages proches de NOW.

const tx = (id: string, updatedAt: number, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: 10,
  date: "2026-10-01",
  categoryId: "divers",
  updatedAt,
  ...extra
});
const cat = (id: string, updatedAt: number, extra: Partial<Category> = {}): Category => ({
  id,
  name: id,
  icon: "Circle",
  kind: "expense",
  keywords: [],
  updatedAt,
  ...extra
});
const state = (s: Partial<SyncState>): SyncState => ({
  transactions: [],
  categories: [],
  currency: "MAD",
  currencyUpdatedAt: 0,
  ...s
});
const byId = <T extends { id: string }>(arr: T[]) =>
  Object.fromEntries(arr.map((e) => [e.id, e]));

describe("mergeStates", () => {
  it("fait l'union des entités des deux appareils", () => {
    const merged = mergeStates(
      state({ transactions: [tx("a", 1)] }),
      state({ transactions: [tx("b", 1)] }),
      NOW
    );
    expect(merged.transactions.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("garde la version la plus récente d'une même entité, dans les deux sens", () => {
    const old = tx("a", 100, { amount: 10 });
    const fresh = tx("a", 200, { amount: 99 });
    expect(mergeStates(state({ transactions: [old] }), state({ transactions: [fresh] }), NOW)
      .transactions[0].amount).toBe(99);
    expect(mergeStates(state({ transactions: [fresh] }), state({ transactions: [old] }), NOW)
      .transactions[0].amount).toBe(99);
  });

  it("deux appareils modifiant des entités différentes ne s'écrasent pas", () => {
    const a = state({ transactions: [tx("x", 300, { amount: 1 }), tx("y", 100, { amount: 2 })] });
    const b = state({ transactions: [tx("x", 100, { amount: 1 }), tx("y", 300, { amount: 50 })] });
    const merged = byId(mergeStates(a, b, NOW).transactions);
    expect(merged.x.updatedAt).toBe(300);
    expect(merged.y.amount).toBe(50);
  });

  it("une suppression plus récente l'emporte (pas de résurrection)", () => {
    const merged = mergeStates(
      state({ transactions: [tx("a", NOW - 200)] }),
      state({ transactions: [tx("a", NOW - 100, { deleted: true })] }),
      NOW
    );
    expect(merged.transactions[0].deleted).toBe(true);
  });

  it("une modification postérieure à la suppression fait revivre l'entité", () => {
    const merged = mergeStates(
      state({ transactions: [tx("a", 300, { amount: 7 })] }),
      state({ transactions: [tx("a", 200, { deleted: true })] }),
      NOW
    );
    expect(merged.transactions[0]).toMatchObject({ amount: 7 });
    expect(merged.transactions[0].deleted).toBeUndefined();
  });

  it("à horodatage égal, la suppression l'emporte (prudence)", () => {
    for (const [a, b] of [
      [tx("a", NOW - 100), tx("a", NOW - 100, { deleted: true })],
      [tx("a", NOW - 100, { deleted: true }), tx("a", NOW - 100)]
    ]) {
      const merged = mergeStates(state({ transactions: [a] }), state({ transactions: [b] }), NOW);
      expect(merged.transactions[0].deleted).toBe(true);
    }
  });

  it("purge les tombstones plus vieux que la durée de conservation", () => {
    const ancien = tx("old", NOW - TOMBSTONE_TTL_MS - 1, { deleted: true });
    const recent = tx("new", NOW - 1000, { deleted: true });
    const merged = mergeStates(state({ transactions: [ancien, recent] }), state({}), NOW);
    expect(merged.transactions.map((t) => t.id)).toEqual(["new"]);
  });

  it("fusionne les catégories par entité (budget, mots-clés appris)", () => {
    const local = cat("transport", 100, { keywords: ["taxi"] });
    const remote = cat("transport", 200, { keywords: ["taxi", "uber"], budget: 500 });
    const merged = mergeStates(state({ categories: [local] }), state({ categories: [remote] }), NOW);
    expect(merged.categories[0]).toMatchObject({ keywords: ["taxi", "uber"], budget: 500 });
  });

  it("traite la devise en dernier-écrit-gagne", () => {
    const a = state({ currency: "MAD", currencyUpdatedAt: 100 });
    const b = state({ currency: "€", currencyUpdatedAt: 200 });
    expect(mergeStates(a, b, NOW)).toMatchObject({ currency: "€", currencyUpdatedAt: 200 });
    expect(mergeStates(b, a, NOW)).toMatchObject({ currency: "€", currencyUpdatedAt: 200 });
  });

  it("est idempotente : fusionner deux fois ne change rien", () => {
    const a = state({ transactions: [tx("a", 1), tx("b", 2, { deleted: true })] });
    const b = state({ transactions: [tx("a", 5), tx("c", 3)], currency: "€", currencyUpdatedAt: 9 });
    const once = mergeStates(a, b, NOW);
    expect(signature(mergeStates(once, b, NOW))).toBe(signature(once));
  });

  it("est commutative : l'ordre des appareils n'importe pas", () => {
    const a = state({ transactions: [tx("a", 1), tx("b", 4)], categories: [cat("c", 2)] });
    const b = state({ transactions: [tx("a", 3), tx("d", 1)], categories: [cat("c", 1)] });
    expect(signature(mergeStates(a, b, NOW))).toBe(signature(mergeStates(b, a, NOW)));
  });
});

describe("signature", () => {
  it("ne dépend pas de l'ordre des entités", () => {
    const s1 = state({ transactions: [tx("a", 1), tx("b", 2)] });
    const s2 = state({ transactions: [tx("b", 2), tx("a", 1)] });
    expect(signature(s1)).toBe(signature(s2));
  });

  it("change quand une entité est modifiée ou supprimée", () => {
    const base = signature(state({ transactions: [tx("a", 1)] }));
    expect(signature(state({ transactions: [tx("a", 2)] }))).not.toBe(base);
    expect(signature(state({ transactions: [tx("a", 1, { deleted: true })] }))).not.toBe(base);
  });
});
