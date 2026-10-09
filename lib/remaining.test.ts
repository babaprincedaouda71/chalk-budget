import { describe, expect, it } from "vitest";
import { remainingToLive } from "./remaining";
import { Transaction } from "./types";

const tx = (id: string, date: string, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  date,
  categoryId: "divers",
  ...extra
});
const today = new Date(2026, 9, 9); // 9 octobre 2026

describe("remainingToLive", () => {
  it("retire des revenus les dépenses faites et celles à venir dans le mois", () => {
    const r = remainingToLive(
      [
        tx("salaire", "2026-09-01", { type: "income", amount: 8000, recurring: true }),
        tx("loyer", "2026-01-15", { amount: 3000, recurring: true }),
        tx("courses", "2026-10-03", { amount: 500 }),
        tx("taxi", "2026-10-09", { amount: 30 })
      ],
      today
    );
    expect(r.income).toBe(8000);
    expect(r.incomeExpected).toBe(0);
    expect(r.spent).toBe(530); // aujourd'hui compris
    expect(r.upcoming.map((o) => o.tx.id)).toEqual(["loyer"]);
    expect(r.upcomingTotal).toBe(3000);
    expect(r.remaining).toBe(4470);
    expect(r.daysLeft).toBe(23); // du 9 au 31 inclus
    expect(r.perDay).toBe(194.35);
  });

  it("compte les revenus attendus plus tard dans le mois", () => {
    const r = remainingToLive(
      [tx("salaire", "2026-08-28", { type: "income", amount: 6000, recurring: true })],
      today
    );
    expect(r.income).toBe(6000);
    expect(r.incomeExpected).toBe(6000);
  });

  it("ignore les autres mois, les mois sautés et les séries terminées", () => {
    const r = remainingToLive(
      [
        tx("ancien", "2026-09-20"),
        tx("futur", "2026-11-02"),
        tx("saute", "2026-01-20", { recurring: true, excludeMonths: ["2026-10"] }),
        tx("fini", "2026-01-20", { recurring: true, recurringUntil: "2026-09" })
      ],
      today
    );
    expect(r.spent).toBe(0);
    expect(r.upcoming).toHaveLength(0);
    expect(r.remaining).toBe(0);
  });

  it("trie les dépenses à venir par date", () => {
    const r = remainingToLive(
      [tx("b", "2026-10-25"), tx("a", "2026-10-12"), tx("c", "2026-10-31")],
      today
    );
    expect(r.upcoming.map((o) => o.tx.id)).toEqual(["a", "b", "c"]);
  });

  it("signale un dépassement prévu sans montant par jour", () => {
    const r = remainingToLive(
      [
        tx("salaire", "2026-10-01", { type: "income", amount: 1000 }),
        tx("loyer", "2026-10-20", { amount: 1500 })
      ],
      today
    );
    expect(r.remaining).toBe(-500);
    expect(r.perDay).toBe(0);
  });

  it("le dernier jour du mois, il reste un jour", () => {
    expect(remainingToLive([], new Date(2026, 9, 31)).daysLeft).toBe(1);
  });
});
