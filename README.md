# Ardoise — Budget (PWA)

Application de gestion de budget skeuomorphe : dashboard « tableau noir » écrit à
la craie, liste de transactions sur « carnet » papier ligné, et ajout magique en
langage naturel (« tomates, oignons 50, tondeuse 182 »).

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Radix UI (Switch, Dialog) — style shadcn-like dans `components/ui/`
- Recharts (graphique circulaire)
- lucide-react (icônes monochromes)

## Lancer en local
```bash
npm install
npm run dev
```
→ http://localhost:3000 (vue mobile centrée `max-w-md` sur desktop)

## Déployer sur Vercel
1. Poussez ce dossier sur un repo GitHub.
2. Importez le repo sur vercel.com — aucune configuration nécessaire.
3. (Optionnel, pour l'analyse IA) Ajoutez la variable d'environnement
   `GEMINI_API_KEY` (clé Google AI Studio — https://aistudio.google.com/apikey)
   dans Settings → Environment Variables, puis redéployez. En local, copiez
   `.env.local.example` en `.env.local`. Sans clé, un parseur local par
   mots-clés prend le relais (fonctionne hors ligne).

## Ajout magique — fonctionnement
- Le client envoie la phrase à `POST /api/parse` avec la liste des catégories.
- Si `GEMINI_API_KEY` est définie : appel à l'API Gemini via son endpoint
  compatible OpenAI (gemini-3.1-flash-lite, JSON forcé par le prompt et
  extrait de façon robuste), avec validation stricte du résultat.
- Sinon (ou en cas d'échec — 429, timeout, réponse invalide) :
  `lib/parser.ts` — chaque nombre clôt un ticket
  dont la note = mots accumulés ; la catégorie est déduite des mots-clés
  définis dans `lib/categories.ts` (modifiables dans l'onglet Catégories).
- Les tickets créés mettent immédiatement à jour la barre revenus/dépenses,
  la liste des catégories et le pie chart.

## Données
Persistance : `localStorage` (clé `chalk-budget-v1`) — aucune donnée ne quitte
l'appareil, sauf le texte envoyé à `/api/parse` (et à Google Gemini si la
clé est configurée). Pour du multi-appareils, remplacez `lib/store.tsx` par des appels
API (Vercel Postgres, Supabase…) : l'interface du store reste identique.

## Transactions récurrentes
Une transaction marquée « récurrente » est comptée dans son mois d'origine puis
dans chaque mois suivant (elle apparaît dans le groupe « Récurrentes » du carnet).

## PWA
`public/manifest.json` + icône SVG maskable : l'app est installable
(« Ajouter à l'écran d'accueil »). Pas de service worker inclus : le mode
hors-ligne complet peut être ajouté avec `@serwist/next` ou `next-pwa`.
