"use client";

import { useMemo, useState } from "react";
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Repeat, Search, X
} from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryPicker } from "@/components/category-picker";
import { TransactionForm } from "@/components/transaction-form";
import { RecurringScopeDialog } from "@/components/recurring-scope-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MONTH_NAMES, formatAmount, useBudget } from "@/lib/store";
import { Occurrence, occurrencesInRange } from "@/lib/occurrences";
import { RecurringScope, TxType } from "@/lib/types";
import { cn, round2 } from "@/lib/utils";

type TypeFilter = "all" | TxType;
type Period = "day" | "week" | "month" | "year";
type SortKey = "date" | "amount" | "category";
type MenuName = "period" | "sort" | "export" | null;

const PERIOD_LABELS: Record<Period, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  year: "Année"
};

const SORT_LABELS: Record<SortKey, string> = {
  date: "Date (récent d'abord)",
  amount: "Montant (décroissant)",
  category: "Catégorie (A → Z)"
};

/** Menu contextuel léger (thème carnet) ancré sous son bouton. */
function Menu({
  open,
  onClose,
  title,
  align = "left",
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  align?: "left" | "right" | "center";
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        role="menu"
        className={cn(
          "absolute top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-ink/20 bg-paper py-1 shadow-xl",
          align === "right" && "right-0",
          align === "left" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2"
        )}
      >
        <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-inkSoft">
          {title}
        </p>
        {children}
      </div>
    </>
  );
}

function MenuItem({
  label,
  selected,
  onClick
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-ink/5",
        selected && "font-bold"
      )}
    >
      <span className="w-4">{selected && <Check className="h-4 w-4" />}</span>
      {label}
    </button>
  );
}

export default function TransactionsPage() {
  const {
    transactions, categories, currency, month, setMonth, deleteTransaction, deleteRecurring
  } = useBudget();

  const [editing, setEditing] = useState<Occurrence | null>(null);
  // Occurrence récurrente en attente de suppression (choix de portée).
  const [deleteScope, setDeleteScope] = useState<Occurrence | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Date>(() => {
    const now = new Date();
    return now.getFullYear() === month.year && now.getMonth() === month.month
      ? now
      : new Date(month.year, month.month, 1);
  });
  const [sort, setSort] = useState<SortKey>("date");
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const [editMode, setEditMode] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  const cat = (id: string) => categories.find((c) => c.id === id);

  // Bornes [start, end) de la période affichée.
  const range = useMemo(() => {
    const a = anchor;
    if (period === "day") {
      const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
      return { start, end: new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1) };
    }
    if (period === "week") {
      const dow = (a.getDay() + 6) % 7; // semaine commençant le lundi
      const start = new Date(a.getFullYear(), a.getMonth(), a.getDate() - dow);
      return {
        start,
        end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      };
    }
    if (period === "year") {
      return {
        start: new Date(a.getFullYear(), 0, 1),
        end: new Date(a.getFullYear() + 1, 0, 1)
      };
    }
    return {
      start: new Date(a.getFullYear(), a.getMonth(), 1),
      end: new Date(a.getFullYear(), a.getMonth() + 1, 1)
    };
  }, [anchor, period]);

  const rangeLabel = useMemo(() => {
    if (period === "day") {
      return anchor.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    if (period === "week") {
      const endIncl = new Date(range.end);
      endIncl.setDate(endIncl.getDate() - 1);
      return `${range.start.getDate()} – ${endIncl.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })}`;
    }
    if (period === "year") return String(anchor.getFullYear());
    return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [period, anchor, range]);

  const shift = (delta: number) => {
    const a = new Date(anchor);
    if (period === "day") a.setDate(a.getDate() + delta);
    else if (period === "week") a.setDate(a.getDate() + 7 * delta);
    else if (period === "year") a.setFullYear(a.getFullYear() + delta);
    else a.setMonth(a.getMonth() + delta, 1);
    setAnchor(a);
    // Garde le tableau noir (dashboard) sur le même mois.
    setMonth({ year: a.getFullYear(), month: a.getMonth() });
  };

  const occurrences = useMemo(
    () => occurrencesInRange(transactions, range.start, range.end),
    [transactions, range]
  );

  // Recherche (note + nom de catégorie) et filtres type/catégorie.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return occurrences.filter(({ tx: t }) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (q) {
        const c = categories.find((x) => x.id === t.categoryId);
        const hay = `${t.note ?? ""} ${c?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [occurrences, typeFilter, categoryFilter, search, categories]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const name = (o: Occurrence) => cat(o.tx.categoryId)?.name ?? "";
    if (sort === "amount") arr.sort((a, b) => b.tx.amount - a.tx.amount);
    else if (sort === "category")
      arr.sort(
        (a, b) => name(a).localeCompare(name(b), "fr") || b.date.localeCompare(a.date)
      );
    else arr.sort((a, b) => b.date.localeCompare(a.date));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, categories]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const { tx } of filtered) {
      if (tx.type === "income") income += tx.amount;
      else expense += tx.amount;
    }
    return { income: round2(income), expense: round2(expense) };
  }, [filtered]);

  const hasFilters = typeFilter !== "all" || !!categoryFilter || !!search.trim();
  const filterCategory = categoryFilter ? cat(categoryFilter) : null;

  const setType = (t: TypeFilter) => {
    setTypeFilter(t);
    setCategoryFilter(null); // la catégorie filtrée dépend du type
  };

  const dateLabel = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  /* ---------- Export ---------- */

  interface ExportRow {
    date: string;
    type: TxType;
    category: string;
    note: string;
    amount: number;
  }

  // Lignes de la PÉRIODE affichée (occurrences, filtres appliqués).
  const periodRows = (): ExportRow[] =>
    sorted.map((o) => ({
      date: o.date,
      type: o.tx.type,
      category: cat(o.tx.categoryId)?.name ?? "",
      note: o.tx.note ?? "",
      amount: o.tx.amount
    }));

  // Lignes de TOUTES les transactions (chaque récurrente une fois, à sa date
  // d'origine), triées par date décroissante — sauvegarde complète.
  const allRows = (): ExportRow[] =>
    [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => ({
        date: t.date,
        type: t.type,
        category: cat(t.categoryId)?.name ?? "",
        note: t.note ?? "",
        amount: t.amount
      }));

  const rowsTotals = (rows: ExportRow[]) => {
    let income = 0;
    let expense = 0;
    for (const r of rows) {
      if (r.type === "income") income += r.amount;
      else expense += r.amount;
    }
    return { income: round2(income), expense: round2(expense) };
  };

  const slug = (label: string) => label.replace(/[^\p{L}\d]+/gu, "-");
  const csvField = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = (rows: ExportRow[], label: string) => {
    const sep = ";";
    const lines = [
      ["Date", "Type", "Catégorie", "Note", "Montant", "Devise"].join(sep)
    ];
    for (const r of rows) {
      lines.push(
        [
          r.date,
          r.type === "income" ? "Revenu" : "Dépense",
          csvField(r.category),
          csvField(r.note),
          String(r.amount).replace(".", ","),
          currency
        ].join(sep)
      );
    }
    // BOM UTF-8 pour qu'Excel détecte l'encodage
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8"
    });
    download(blob, `ardoise-transactions-${slug(label)}.csv`);
  };

  /**
   * PDF généré côté client (jsPDF, importé à la demande) : fonctionne aussi
   * dans la PWA iOS, où la boîte d'impression n'est pas disponible.
   */
  const exportPdf = async (rows: ExportRow[], label: string) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    // Les espaces fines insécables de toLocaleString ne sont pas dans les
    // polices standard du PDF.
    // Les polices standard du PDF n'encodent que WinAnsi (Latin-1 + extras
    // cp1252). On normalise les espaces ins\u00E9cables et on remplace tout
    // caract\u00E8re non repr\u00E9sentable (arabe, CJK\u2026) par \u00AB ? \u00BB pour \u00E9viter qu'il
    // disparaisse silencieusement \u2014 le CSV, lui, reste fid\u00E8le en UTF-8.
    const winAnsiExtra =
      "\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D" +
      "\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178";
    const unsupported = new RegExp(`[^\\u0000-\\u00FF${winAnsiExtra}]`, "g");
    const clean = (s: string) =>
      s.normalize("NFC").replace(/[\u202F\u00A0]/g, " ").replace(unsupported, "?");
    const money = (n: number) => clean(formatAmount(n, currency));
    const t = rowsTotals(rows);
    const left = 15;
    const right = 195;
    let y = 18;

    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(32);
    doc.text(`Ardoise — Transactions (${label})`, left, y);
    y += 7;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(110);
    doc.text(`Revenus : ${money(t.income)}   ·   Dépenses : ${money(t.expense)}`, left, y);
    y += 9;

    const tableHeader = () => {
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(80);
      doc.text("Date", left, y);
      doc.text("Catégorie", left + 27, y);
      doc.text("Note", left + 77, y);
      doc.text("Montant", right, y, { align: "right" });
      y += 2;
      doc.setDrawColor(180);
      doc.line(left, y, right, y);
      y += 5;
      doc.setFont("helvetica", "normal").setFontSize(9);
    };
    tableHeader();

    for (const r of rows) {
      const catLines = doc.splitTextToSize(clean(r.category), 46) as string[];
      const noteLines = doc.splitTextToSize(clean(r.note), 68) as string[];
      const rowH = Math.max(1, catLines.length, noteLines.length) * 4.5 + 2.5;
      if (y + rowH > 285) {
        doc.addPage();
        y = 15;
        tableHeader();
      }
      doc.setTextColor(40);
      doc.text(r.date, left, y);
      doc.text(catLines, left + 27, y);
      doc.text(noteLines, left + 77, y);
      if (r.type === "income") doc.setTextColor(21, 128, 61);
      else doc.setTextColor(176, 68, 44);
      doc.text(money(r.amount), right, y, { align: "right" });
      y += rowH;
    }

    doc.save(`ardoise-transactions-${slug(label)}.pdf`);
  };

  /* ---------- Rendu ---------- */

  return (
    <div className="paper-bg flex min-h-0 flex-1 flex-col text-ink">
      {/* En-tête : mode édition / période / ajout */}
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 pl-4">
        <button
          onClick={() => {
            setEditMode((v) => !v);
            setArmedDelete(null);
          }}
          className={cn(
            "text-sm font-medium transition",
            editMode ? "font-bold text-ink" : "text-inkSoft hover:text-ink"
          )}
        >
          {editMode ? "OK" : "Modifier"}
        </button>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "period" ? null : "period")}
            className="flex items-center gap-1 rounded-lg border border-ink/20 bg-white/50 px-4 py-1.5 font-bold transition hover:border-ink/50"
          >
            {rangeLabel}
            <ChevronDown className="h-4 w-4 text-inkSoft" />
          </button>
          <Menu
            open={openMenu === "period"}
            onClose={() => setOpenMenu(null)}
            title="Afficher par"
            align="center"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <MenuItem
                key={p}
                label={PERIOD_LABELS[p]}
                selected={period === p}
                onClick={() => {
                  setPeriod(p);
                  setOpenMenu(null);
                }}
              />
            ))}
          </Menu>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          aria-label="Ajouter une transaction"
          className="rounded-full p-1.5 text-ink transition hover:bg-ink/10"
        >
          <Plus className="h-6 w-6" strokeWidth={2.2} />
        </button>
      </header>

      {/* Barre d'outils : tri / navigation / export */}
      <div className="flex items-center justify-between border-b-2 border-ink/15 px-4 pb-2 pl-4">
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "sort" ? null : "sort")}
            className="text-sm font-medium text-inkSoft transition hover:text-ink"
          >
            Trier
          </button>
          <Menu open={openMenu === "sort"} onClose={() => setOpenMenu(null)} title="Trier par">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <MenuItem
                key={k}
                label={SORT_LABELS[k]}
                selected={sort === k}
                onClick={() => {
                  setSort(k);
                  setOpenMenu(null);
                }}
              />
            ))}
          </Menu>
        </div>

        <div className="flex items-center gap-8">
          <button onClick={() => shift(-1)} aria-label="Période précédente" className="text-inkSoft hover:text-ink">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => shift(1)} aria-label="Période suivante" className="text-inkSoft hover:text-ink">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "export" ? null : "export")}
            className="text-sm font-medium text-inkSoft transition hover:text-ink"
          >
            Exporter
          </button>
          <Menu
            open={openMenu === "export"}
            onClose={() => setOpenMenu(null)}
            title="Exporter"
            align="right"
          >
            <MenuItem
              label="PDF — période affichée"
              onClick={() => {
                setOpenMenu(null);
                void exportPdf(periodRows(), rangeLabel);
              }}
            />
            <MenuItem
              label="PDF — toutes les transactions"
              onClick={() => {
                setOpenMenu(null);
                void exportPdf(allRows(), "Toutes les transactions");
              }}
            />
            <MenuItem
              label="CSV — période affichée"
              onClick={() => {
                setOpenMenu(null);
                exportCsv(periodRows(), rangeLabel);
              }}
            />
            <MenuItem
              label="CSV — toutes les transactions"
              onClick={() => {
                setOpenMenu(null);
                exportCsv(allRows(), "Toutes les transactions");
              }}
            />
          </Menu>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="border-b border-ink/10 py-3 pl-4 pr-4">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkSoft" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une transaction…"
            className="w-full rounded-lg border border-ink/20 bg-white/60 py-2 pl-9 pr-8 text-sm text-ink placeholder:text-inkSoft/70 focus:border-ink/50 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-inkSoft hover:bg-ink/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", "Toutes"],
              ["expense", "Dépenses"],
              ["income", "Revenus"]
            ] as [TypeFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setType(value)}
              aria-pressed={typeFilter === value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                typeFilter === value
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 bg-white/40 text-inkSoft hover:border-ink/50"
              )}
            >
              {label}
            </button>
          ))}

          {typeFilter !== "all" && (
            <button
              onClick={() => setFilterPickerOpen(true)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                filterCategory
                  ? "border-ink bg-ink text-paper"
                  : "border-dashed border-ink/40 bg-white/40 text-inkSoft hover:border-ink/60"
              )}
            >
              {filterCategory && (
                <CategoryIcon name={filterCategory.icon} className="h-3.5 w-3.5" />
              )}
              <span className="max-w-[10rem] truncate">
                {filterCategory ? filterCategory.name : "Catégorie"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Totaux de la période : revenus | dépenses */}
      <div className="flex text-center text-sm font-bold tabular-nums">
        <div className="flex-1 bg-greenDeep/10 py-2 text-greenDeep">
          {formatAmount(totals.income, currency)}
        </div>
        <div className="flex-1 bg-brickDeep/10 py-2 text-brickDeep">
          {formatAmount(totals.expense, currency)}
        </div>
      </div>

      {/* Liste plate des transactions — seule zone défilante de la page. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="min-h-full pb-28 pl-4 pr-4">
        {sorted.length === 0 && (
          <p className="pt-10 text-center text-inkSoft">
            {hasFilters
              ? "Aucune transaction ne correspond à la recherche."
              : "Page blanche : aucune transaction sur cette période."}
          </p>
        )}

        <ul className="divide-y divide-ink/5">
          {sorted.map((o) => {
            const t = o.tx;
            const c = cat(t.categoryId);
            const armed = armedDelete === o.key;
            return (
              <li key={o.key} className="flex h-16 items-center gap-3">
                {editMode && (
                  <button
                    onClick={() => setArmedDelete(armed ? null : o.key)}
                    aria-label={armed ? "Annuler la suppression" : "Supprimer"}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brickDeep text-sm font-bold leading-none text-white"
                  >
                    −
                  </button>
                )}

                <button
                  onClick={() => !editMode && setEditing(o)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 text-left",
                    !editMode && "hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none"
                  )}
                >
                  <CategoryIcon
                    name={c?.icon ?? "CircleDashed"}
                    className="h-6 w-6 shrink-0 text-inkSoft"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <span className="truncate">{t.note || c?.name || "—"}</span>
                      {t.recurring && (
                        <Repeat className="h-3.5 w-3.5 shrink-0 text-inkSoft" aria-label="Récurrente" />
                      )}
                    </span>
                    <span className="block truncate text-xs capitalize text-inkSoft">
                      {dateLabel(o.date)}
                    </span>
                  </span>

                  {!armed && (
                    <>
                      <span
                        className={cn(
                          "shrink-0 font-bold tabular-nums",
                          t.type === "income" ? "text-greenDeep" : "text-brickDeep"
                        )}
                      >
                        {formatAmount(t.amount, currency)}
                      </span>
                      {!editMode && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-inkSoft/50" />
                      )}
                    </>
                  )}
                </button>

                {armed && (
                  <button
                    onClick={() => {
                      // Récurrente : demander la portée ; sinon suppression directe.
                      if (t.recurring) setDeleteScope(o);
                      else deleteTransaction(t.id);
                      setArmedDelete(null);
                    }}
                    className="shrink-0 rounded-lg bg-brickDeep px-3 py-2 text-sm font-bold text-white"
                  >
                    Supprimer
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogTitle>Nouvelle transaction</DialogTitle>
          <TransactionForm onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogTitle>Modifier la transaction</DialogTitle>
          {editing && (
            <TransactionForm
              initial={editing.tx}
              occurrenceDate={editing.date}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {typeFilter !== "all" && (
        <CategoryPicker
          open={filterPickerOpen}
          type={typeFilter}
          selectedId={categoryFilter}
          allowAll
          title="Filtrer par catégorie"
          onSelect={(id) => {
            setCategoryFilter(id);
            setFilterPickerOpen(false);
          }}
          onClose={() => setFilterPickerOpen(false)}
        />
      )}

      <RecurringScopeDialog
        open={deleteScope !== null}
        action="delete"
        onChoose={(scope: RecurringScope) => {
          if (deleteScope) deleteRecurring(deleteScope.tx, deleteScope.date, scope);
          setDeleteScope(null);
        }}
        onCancel={() => setDeleteScope(null)}
      />
    </div>
  );
}
