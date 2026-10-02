"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (public/sw.js) pour le mode hors ligne.
 * Uniquement en production : en dev, le cache masquerait les modifications.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Échec silencieux : l'app fonctionne normalement sans service worker.
    });
  }, []);
  return null;
}
