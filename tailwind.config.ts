import type { Config } from "tailwindcss";

/**
 * Thème « moderne » (refonte du 19/07/2026) : les noms de jetons historiques
 * (board, chalk, brick, paper, ink…) sont conservés pour ne pas toucher aux
 * composants, mais pointent désormais vers une palette contemporaine —
 * tableau de bord sombre ardoise, pages claires, accents émeraude/rose.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: "#0F172A", // surface sombre du tableau de bord
        boardEdge: "#0B1120", // fond de l'app + Tab Bar
        chalk: "#F8FAFC", // texte principal sur fond sombre
        chalkDim: "#94A3B8", // texte secondaire sur fond sombre
        chalkGreen: "#34D399", // accent revenus (émeraude)
        brick: "#FB7185", // dépenses sur fond sombre (rose clair)
        brickDeep: "#E11D48", // dépenses sur fond clair (rose soutenu)
        paper: "#F5F7FA", // fond des pages claires
        paperLine: "#E2E8F0", // séparateurs discrets
        paperMargin: "#E2E8F0", // (hérité, neutralisé)
        ink: "#0F172A", // texte principal sur fond clair
        inkSoft: "#64748B" // texte secondaire sur fond clair
      },
      fontFamily: {
        chalk: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      maxWidth: { app: "28rem" }
    }
  },
  plugins: []
};
export default config;
