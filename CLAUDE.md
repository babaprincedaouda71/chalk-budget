# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server → http://localhost:3000
npm run build    # production build (also serves as the type check — no separate lint/test setup)
npm run start    # serve the production build
```

There are no tests and no lint script configured.

## Règles projet (à respecter impérativement)

- **Règle critique — fallback local** : le fallback local de l'ajout magique (`lib/parser.ts`) ne doit JAMAIS être cassé — l'app doit toujours fonctionner sans clé API. Toute erreur de l'API IA (429, timeout, réponse invalide) bascule **silencieusement** sur le parseur local.
- **Validation stricte de `/api/parse`** : les items retournés sont toujours validés — `amount > 0`, `categoryId` existant dans le store, `note` tronquée à 120 caractères. Ne pas assouplir cette validation.
- **Design intentionnel à préserver** : dashboard = skeuomorphisme « tableau noir » (police craie Caveat, revenus vert craie `#9ED8A4`, dépenses rouge brique `#D9765C`) ; transactions/formulaires = thème « carnet » papier ligné clair. Ne pas remplacer par un design générique.
- **UI 100 % en français** : labels, messages d'erreur, états vides.
- **Contrainte layout** : vue mobile `max-w-md` centrée, Tab Bar fixe en bas.
- **Après toute modification**, vérifier que `npm run build` passe.
- **Ne jamais commiter `.env.local`** (contient `GEMINI_API_KEY`) ; le modèle à copier est `.env.local.example`.

## What this app is

"Ardoise — Budget": a French-language, mobile-first budgeting PWA with a skeuomorphic design — the dashboard is a chalk-on-blackboard, the transactions list is a lined paper notebook. Next.js 14 App Router + TypeScript + Tailwind. All UI copy, comments, and category data are in French (see règles projet); keep code comments in French to match.

## Architecture

### State: single client-side store, localStorage-first with optional cloud sync
`lib/store.tsx` is the heart of the app. `BudgetProvider` (mounted in `app/layout.tsx`) holds all state — transactions, categories, currency, selected month — persists it to `localStorage` under key `chalk-budget-v1`, and exposes everything via the `useBudget()` hook, including derived data (`monthTransactions`, `totals`, `expenseByCategory`).

Key store behaviors:
- **Recurring transactions**: a transaction with `recurring: true` counts in its origin month **and every later month** (computed in `monthTransactions`, not duplicated in storage).
- Wait for `ready` before trusting store data (initial localStorage load happens in an effect).
- **Multi-device sync (optional)**: the user sets a secret code (≥ 6 chars, stored in localStorage key `chalk-budget-sync-code`); the whole state is pulled from `/api/sync` on startup and pushed (debounced 1.5s) after each change, with last-write-wins conflict resolution via an `updatedAt` timestamp persisted alongside the state. `app/api/sync/route.ts` stores the blob in Upstash Redis (key = SHA-256 of the code; env `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `KV_*` fallbacks). Without those env vars the route returns 503 and the store shows status `unavailable` — **localStorage always remains the source of truth; sync must never be required for the app to work** (same philosophy as the parser fallback). Beware the `applyingRemoteRef` guard in the store: it prevents a remote state application from being re-pushed with a fresh timestamp (device ping-pong).

### "Ajout magique" (natural-language transaction entry)
The signature feature: the user types e.g. `"tomates, oignons 50, tondeuse 182"` and it becomes structured transactions. Flow:
1. `components/smart-input.tsx` POSTs `{ text, categories }` to `app/api/parse/route.ts`.
2. If `GEMINI_API_KEY` is set, the route calls Google Gemini via its OpenAI-compatible endpoint (`gemini-3.1-flash-lite`; JSON forced by the system prompt and extracted robustly — `response_format` is not guaranteed on that compat layer) and strictly validates the result (see règles projet).
3. Otherwise — or on any AI failure — it falls back to `lib/parser.ts` (`parseLocally`): each number token closes a "ticket" whose note is the words accumulated since the previous ticket; category is inferred by keyword matching against `Category.keywords` (longer keyword match wins).
4. Response is `{ items: ParsedItem[], engine: "gemini" | "local" }`. `leftoverWords()` in `lib/parser.ts` reports trailing words that had no amount so the UI can warn the user.

### Data model (`lib/types.ts`)
`Transaction` (type income/expense, ISO `yyyy-mm-dd` date, `categoryId`, optional `recurring`), `Category` (id, name, lucide icon name as a string, kind, keywords for the parser). Defaults live in `lib/categories.ts`; `FALLBACK_EXPENSE_ID` ("divers") is used when no keyword matches. Category icons are referenced by lucide-react icon **name strings** resolved in `components/category-icon.tsx`.

### Pages & layout
Four tab pages under `app/`: `/` (blackboard dashboard: totals, ratio bar, pie chart, smart input), `/transactions` (paper notebook list), `/categories`, `/settings`. `app/layout.tsx` wraps everything in `BudgetProvider` plus a centered `max-w-app` (28rem) mobile frame with `components/tab-bar.tsx` at the bottom — pages should assume mobile widths.

### Theming
The skeuomorphic look lives in `tailwind.config.ts` (custom palette: `board`, `chalk`, `paper`, `brick`, `ink`, …) and `app/globals.css` (utility classes: `.board-bg`, `.chalk-text`, `.chalk-underline`, `.paper-bg`, `.notebook-lines`, `.wood-frame`). Two Google fonts via CSS variables: `font-chalk` (Caveat, for chalk writing) and `font-body` (Karla). Reuse these classes/tokens rather than inventing new colors. `components/ui/` contains shadcn-style Radix wrappers (dialog, switch).
