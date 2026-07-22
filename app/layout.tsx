import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { BudgetProvider } from "@/lib/store";
import { TabBar } from "@/components/tab-bar";

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
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
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
          <div className="relative mx-auto flex h-dvh w-full max-w-app flex-col overflow-hidden shadow-2xl">
            {/* pt : réserve la zone de l'encoche / barre d'état (PWA plein
                écran). Chaque page gère son propre défilement interne ; les
                zones défilantes prévoient un pb suffisant pour la Tab Bar. */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
              {children}
            </main>
            <TabBar />
          </div>
          <Analytics />
        </BudgetProvider>
      </body>
    </html>
  );
}
