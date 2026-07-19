"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatAmount, useBudget } from "@/lib/store";

/** Palette moderne — lisible sur la surface sombre du tableau de bord. */
const CHALK_COLORS = [
  "#34D399", "#FB7185", "#FBBF24", "#38BDF8", "#A78BFA",
  "#FB923C", "#2DD4BF", "#F472B6", "#A3E635", "#818CF8"
];

export function ExpensePieChart() {
  const { expenseByCategory, totals, currency } = useBudget();

  if (expenseByCategory.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-chalkDim">Aucune dépense ce mois-ci.</p>
        <p className="mt-1 text-xs text-chalkDim/60">
          Ajoutez un ticket via l&apos;ajout magique ou le bouton +.
        </p>
      </div>
    );
  }

  const data = expenseByCategory.map((e, i) => ({
    name: e.category.name,
    value: e.total,
    pct: totals.expense > 0 ? (e.total / totals.expense) * 100 : 0,
    fill: CHALK_COLORS[i % CHALK_COLORS.length]
  }));

  return (
    <section
      aria-label="Répartition des dépenses"
      className="mx-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10"
    >
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-chalkDim">
        Répartition
      </h2>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              labelLine={false}
              label={({ pct, x, y }) =>
                pct >= 6 ? (
                  <text
                    x={x}
                    y={y}
                    fill="#F8FAFC"
                    fontSize={12}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {pct.toFixed(0)}%
                  </text>
                ) : null
              }
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatAmount(v, currency)}
              contentStyle={{
                background: "#0B1120",
                border: "1px solid rgba(248,250,252,0.12)",
                borderRadius: 10,
                color: "#F8FAFC",
                fontSize: 12
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Légende avec pourcentages */}
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.fill }}
              aria-hidden
            />
            <span className="truncate text-chalkDim">{d.name}</span>
            <span className="ml-auto text-chalk">{d.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
