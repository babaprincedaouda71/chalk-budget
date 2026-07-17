"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatAmount, useBudget } from "@/lib/store";

/** Palette "craies de couleur" — lisible sur fond tableau noir. */
const CHALK_COLORS = [
  "#9ED8A4", "#D9765C", "#F2D06B", "#8EC7E8", "#C9A2E0",
  "#E8A87C", "#7FD6C2", "#E890B0", "#B5C97A", "#A8B8D8"
];

export function ExpensePieChart() {
  const { expenseByCategory, totals, currency } = useBudget();

  if (expenseByCategory.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="chalk-text text-xl text-chalkDim">
          Aucune dépense ce mois-ci.
        </p>
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
    <section aria-label="Répartition des dépenses" className="px-4">
      <h2 className="chalk-text mb-1 text-2xl text-chalk">Répartition</h2>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={88}
              stroke="#2E3532"
              strokeWidth={2}
              labelLine={false}
              label={({ pct, x, y }) =>
                pct >= 5 ? (
                  <text
                    x={x}
                    y={y}
                    fill="#F2EFE6"
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
                background: "#232926",
                border: "1px solid rgba(242,239,230,0.2)",
                borderRadius: 8,
                color: "#F2EFE6",
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
