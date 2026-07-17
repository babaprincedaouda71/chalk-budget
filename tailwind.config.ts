import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: "#2E3532",
        boardEdge: "#232926",
        chalk: "#F2EFE6",
        chalkDim: "#C9C6BC",
        chalkGreen: "#9ED8A4",
        brick: "#D9765C",
        brickDeep: "#B85C43",
        paper: "#F7F1E1",
        paperLine: "#B9C8DB",
        paperMargin: "#DE9A93",
        ink: "#3A342C",
        inkSoft: "#7A7264"
      },
      fontFamily: {
        chalk: ["var(--font-chalk)", "cursive"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      maxWidth: { app: "28rem" }
    }
  },
  plugins: []
};
export default config;
