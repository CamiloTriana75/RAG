import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const headlineFont = Manrope({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Cognitive Architect - Extracción de Documentos con IA",
  description:
    "Transforme documentos no estructurados en inteligencia estructurada con precisión editorial. Motor de IA para extracción, categorización y análisis de datos críticos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body
        className={`${bodyFont.variable} ${headlineFont.variable} min-h-screen flex flex-col antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
