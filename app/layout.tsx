import type { Metadata, Viewport } from "next";
import { Caveat, Karla } from "next/font/google";
import "./globals.css";
import { BudgetProvider } from "@/lib/store";
import { TabBar } from "@/components/tab-bar";

const chalk = Caveat({
  subsets: ["latin"],
  variable: "--font-chalk",
  weight: ["500", "600", "700"]
});

const body = Karla({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "Ardoise — Budget",
  description: "Gestion de budget skeuomorphe : tableau noir, craie et carnet.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ardoise",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#232926",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Indispensable en PWA plein écran : permet d'occuper l'écran jusqu'aux
  // bords tout en exposant env(safe-area-inset-*) pour l'encoche et la
  // barre d'accueil.
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${chalk.variable} ${body.variable}`}>
      <body>
        <BudgetProvider>
          {/* Cadre mobile : largeur max centrée sur desktop */}
          <div className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col shadow-2xl">
            {/* pt : réserve la zone de l'encoche / barre d'état (PWA plein écran) ;
                pb : dégage la Tab Bar fixe et la barre d'accueil. */}
            <main className="flex-1 pb-24 pt-[env(safe-area-inset-top)]">
              {children}
            </main>
            <TabBar />
          </div>
        </BudgetProvider>
      </body>
    </html>
  );
}
