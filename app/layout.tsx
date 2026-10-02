import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { BudgetProvider } from "@/lib/store";
import { TabBar } from "@/components/tab-bar";
import { ServiceWorker } from "@/components/service-worker";
import { ViewportFix } from "@/components/viewport-fix";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Ardoise — Budget",
  description: "Gestion de budget simple : dépenses, revenus et synchronisation multi-appareils.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ardoise",
    // Obligatoire : en mode "default", iOS (web app de l'écran d'accueil)
    // calcule mal la hauteur de l'écran (100dvh trop court, bande vide sous
    // la Tab Bar). Le texte de la barre d'état est alors blanc : la zone est
    // peinte en sombre par le bandeau ci-dessous.
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" }
  }
};

export const viewport: Viewport = {
  themeColor: "#F5F7FA",
  width: "device-width",
  initialScale: 1,
  // Pas de maximumScale : le pincer-pour-zoomer reste autorisé (accessibilité).
  // Indispensable en PWA plein écran : occupe l'écran jusqu'aux bords tout en
  // exposant env(safe-area-inset-*) pour l'encoche et la barre d'accueil.
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={body.variable}>
      <body>
        <BudgetProvider>
          {/* Cadre mobile : largeur max centrée sur desktop */}
          <div className="relative mx-auto flex h-dvh w-full max-w-app flex-col overflow-hidden bg-paper shadow-2xl">
            {/* Bandeau sombre sous la barre d'état (heure, batterie en blanc)
                en web app plein écran ; hauteur nulle dans le navigateur. */}
            <div aria-hidden className="h-[env(safe-area-inset-top)] shrink-0 bg-boardEdge" />
            {/* Chaque page gère son propre défilement interne ; les zones
                défilantes prévoient un pb suffisant pour la Tab Bar. */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </main>
            <TabBar />
          </div>
          <Analytics />
          <ServiceWorker />
          <ViewportFix />
        </BudgetProvider>
      </body>
    </html>
  );
}
