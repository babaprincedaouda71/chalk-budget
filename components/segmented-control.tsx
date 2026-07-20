"use client";

import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * Interrupteur à segments (style iOS) — contrôle unifié pour un choix binaire
 * ou ternaire (ex. Dépense / Revenu). Pensé pour les surfaces claires.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex rounded-xl bg-ink/5 p-1 ring-1 ring-ink/10", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-bold transition",
            value === o.value ? "bg-white text-ink shadow-sm" : "text-inkSoft hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
