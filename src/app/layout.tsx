import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Mono, Noto_Sans_TC } from "next/font/google";
import type { ReactNode } from "react";

import { AuthGate } from "@/auth/auth-gate";
import { AuthProvider } from "@/auth/auth-provider";
import { TrainingProvider } from "@/providers/training-provider";

import "./globals.css";

const displayFont = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bodyFont = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dataFont = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MLevelUp",
  description: "A mission-driven training system for aspiring ML engineers.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${dataFont.variable}`}>
        <AuthProvider>
          <AuthGate>
            <TrainingProvider>{children}</TrainingProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
