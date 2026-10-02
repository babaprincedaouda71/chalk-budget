"use client";

import { useEffect, useState } from "react";

/**
 * TEMPORAIRE — diagnostic de la bande vide sous la Tab Bar (web app iOS).
 * Affiche les mesures d'écran et peut colorer la zone située sous le
 * viewport, pour savoir si elle est utilisable. À retirer une fois corrigé.
 */
export function DisplayDiagnostic() {
  const [info, setInfo] = useState<string[]>([]);
  const [probe, setProbe] = useState(false);

  useEffect(() => {
    const measure = (css: string) => {
      const el = document.createElement("div");
      el.style.cssText = `position:fixed;top:0;left:0;width:1px;visibility:hidden;${css}`;
      document.body.appendChild(el);
      const v = getComputedStyle(el).height;
      el.remove();
      return v;
    };
    const read = () =>
      setInfo([
        `standalone : ${
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true
        }`,
        `screen.height : ${window.screen.height}`,
        `innerHeight : ${window.innerHeight}`,
        `visualViewport : ${window.visualViewport?.height ?? "?"}`,
        `100vh : ${measure("height:100vh")}`,
        `100lvh : ${measure("height:100lvh")}`,
        `100dvh : ${measure("height:100dvh")}`,
        `inset haut : ${measure("height:env(safe-area-inset-top)")}`,
        `inset bas : ${measure("height:env(safe-area-inset-bottom)")}`,
        `barre d'état : ${
          document
            .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
            ?.getAttribute("content") ?? "?"
        }`,
        `userAgent : ${navigator.userAgent}`
      ]);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-inkSoft">
        Diagnostic d&apos;affichage (temporaire)
      </h2>
      <div className="space-y-2 rounded-xl border border-ink/15 bg-white/40 p-3">
        <pre className="whitespace-pre-wrap break-all text-xs text-ink">{info.join("\n")}</pre>
        <button
          onClick={() => setProbe((p) => !p)}
          className="w-full rounded-lg border border-ink/25 py-2 text-sm"
        >
          {probe ? "Masquer le test de couleur" : "Tester la zone sous l'app"}
        </button>
      </div>
      {/* Bande jaune collée sous le viewport : visible = zone utilisable. */}
      {probe && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 z-[100] bg-yellow-400"
          style={{ top: "100dvh", height: "200px" }}
        />
      )}
      {probe && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] border-4 border-fuchsia-500"
          style={{ height: "100lvh" }}
        />
      )}
    </section>
  );
}
