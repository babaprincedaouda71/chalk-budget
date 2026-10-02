"use client";

import { useEffect } from "react";

/**
 * Contournement d'un bug iOS (web app de l'écran d'accueil, WebKit 301994) :
 * le viewport est amputé de la hauteur de la barre d'état (ex. 852 au lieu
 * de 896) et la bande du bas est inaccessible — on ne peut pas y dessiner.
 * La barre d'accueil de l'iPhone se trouve alors dans cette bande : la marge
 * `safe-area-inset-bottom` de la Tab Bar devient un vide inutile.
 * Quand le bug est détecté, on pose `--tabbar-pb: 0px` sur <html>.
 */
export function ViewportFix() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    const apply = () => {
      // screen.width/height ne pivotent pas sur iOS : hauteur selon l'orientation.
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const screenH = portrait
        ? Math.max(window.screen.width, window.screen.height)
        : Math.min(window.screen.width, window.screen.height);
      const shortened = screenH - window.innerHeight > 1;
      document.documentElement.style.setProperty(
        "--tabbar-pb",
        shortened ? "0px" : "env(safe-area-inset-bottom)"
      );
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return null;
}
