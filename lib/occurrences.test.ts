import { describe, expect, it } from "vitest";
import { occurrencesInRange } from "./occurrences";
import { budgetAlertsFor, budgetLevel, budgetStatuses, monthSpendingByCategory, parseBudgetInput } from "./budget";
import { monthlyTotals, niceCeil } from "./evolution";
import { Category, Transaction } from "./types";

const tx = (id: string, date: string, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  date,
  categoryId: "transport",
  ...extra
});
const d = (iso: string) => new Date(iso + "T00:00:00");
const dates = (txs: Transaction[], start: string, end: string) =>
  occurrencesInRange(txs, d(start), d(end)).map((o) => o.date);

describe("occurrencesInRange — transactions simples", () => {
  it("inclut le début et exclut la fin de l'intervalle [start, end)", () => {
    const txs = [tx("a", "2026-10-01"), tx("b", "2026-10-31"), tx("c", "2026-11-01")];
    expect(dates(txs, "2026-10-01", "2026-11-01")).toEqual(["2026-10-01", "2026-10-31"]);
  });
});

describe("occurrencesInRange — transactions récurrentes", () => {
  it("se répète chaque mois à partir de son mois d'origine, jamais avant", () => {
    const loyer = tx("loyer", "2026-08-05", { recurring: true });
    expect(dates([loyer], "2026-06-01", "2026-11-01")).toEqual([
      "2026-08-05",
      "2026-09-05",
      "2026-10-05"
    ]);
  });

  it("ramène le jour au dernier jour des mois plus courts", () => {
    const t = tx("t", "2026-01-31", { recurring: true });
    expect(dates([t], "2026-02-01", "2026-05-01")).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30"
    ]);
  });

  it("saute les mois exclus (« cette occurrence »)", () => {
    const t = tx("t", "2026-01-10", { recurring: true, excludeMonths: ["2026-03"] });
    expect(dates([t], "2026-02-01", "2026-05-01")).toEqual(["2026-02-10", "2026-04-10"]);
  });

  it("s'arrête au dernier mois inclus (« ce mois et les suivants »)", () => {
    const t = tx("t", "2026-01-10", { recurring: true, recurringUntil: "2026-03" });
    expect(dates([t], "2026-01-01", "2026-12-01")).toEqual([
      "2026-01-10",
      "2026-02-10",
      "2026-03-10"
    ]);
  });

  it("produit des clés stables et distinctes par mois", () => {
    const t = tx("t", "2026-01-10", { recurring: true });
    const keys = occurrencesInRange([t], d("2026-01-01"), d("2026-04-01")).map((o) => o.key);
    expect(keys).toEqual(["t:2026-01", "t:2026-02", "t:2026-03"]);
  });
});

const transport: Category = {
  id: "transport",
  name: "Transport",
  icon: "Bus",
  kind: "expense",
  keywords: [],
  budget: 100
};
const courses: Category = { ...transport, id: "courses", name: "Courses", budget: undefined };

describe("budgets", () => {
  it("lit les montants saisis (espaces, virgule) et refuse les invalides", () => {
    expect(parseBudgetInput("")).toBeUndefined();
    expect(parseBudgetInput("2 000")).toBe(2000);
    expect(parseBudgetInput("1500,50")).toBe(1500.5);
    expect(parseBudgetInput("0")).toBeNull();
    expect(parseBudgetInput("abc")).toBeNull();
    expect(parseBudgetInput("-5")).toBeNull();
  });

  it("classe : sous 80 % ok, de 80 à 100 % alerte, au-delà dépassé", () => {
    expect(budgetLevel(79, 100)).toBe("ok");
    expect(budgetLevel(80, 100)).toBe("warn");
    expect(budgetLevel(100, 100)).toBe("warn");
    expect(budgetLevel(100.01, 100)).toBe("over");
  });

  it("calcule les dépenses du mois, récurrentes comprises, revenus exclus", () => {
    const txs = [
      tx("a", "2026-10-03", { amount: 30 }),
      tx("b", "2026-09-10", { amount: 20, recurring: true }),
      tx("c", "2026-10-04", { amount: 999, type: "income" }),
      tx("d", "2026-11-01", { amount: 50 })
    ];
    expect(monthSpendingByCategory(txs, d("2026-10-15")).get("transport")).toBe(50);
  });

  it("ne liste que les catégories ayant un budget", () => {
    const statuses = budgetStatuses([transport, courses], new Map([["transport", 85]]));
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({ spent: 85, remaining: 15, level: "warn" });
  });

  it("alerte seulement au franchissement d'un seuil", () => {
    const month = d("2026-10-15");
    const add = (amount: number) => [{ type: "expense" as const, amount, categoryId: "transport" }];
    const before = [tx("a", "2026-10-02", { amount: 70 })];
    // 70 → 85 : passage en alerte.
    expect(budgetAlertsFor(before, [transport], add(15), month)).toMatchObject([
      { level: "warn", spent: 85 }
    ]);
    // 70 → 75 : toujours ok, pas d'alerte.
    expect(budgetAlertsFor(before, [transport], add(5), month)).toEqual([]);
    // 85 → 90 : déjà en alerte, pas de nouvelle alerte.
    const atWarn = [tx("a", "2026-10-02", { amount: 85 })];
    expect(budgetAlertsFor(atWarn, [transport], add(5), month)).toEqual([]);
    // 85 → 115 : dépassement.
    expect(budgetAlertsFor(atWarn, [transport], add(30), month)).toMatchObject([
      { level: "over", spent: 115 }
    ]);
  });
});

describe("évolution sur 12 mois", () => {
  it("renvoie 12 mois finissant par le mois de référence, récurrentes comprises", () => {
    const txs = [
      tx("sal", "2026-01-01", { type: "income", amount: 8000, recurring: true }),
      tx("a", "2026-10-03", { amount: 30 }),
      tx("old", "2025-10-31", { amount: 999 }) // hors fenêtre
    ];
    const months = monthlyTotals(txs, d("2026-10-15"));
    expect(months).toHaveLength(12);
    expect(months[0].month).toEqual(d("2025-11-01"));
    expect(months[11]).toMatchObject({ income: 8000, expense: 30 });
    expect(months[1]).toMatchObject({ income: 0, expense: 0 }); // décembre 2025
    expect(months[2].income).toBe(8000); // janvier 2026
  });

  it("arrondit le plafond de l'axe à une valeur ronde", () => {
    expect(niceCeil(11000)).toBe(15000);
    expect(niceCeil(8000)).toBe(8000);
    expect(niceCeil(0)).toBe(1);
  });
});
