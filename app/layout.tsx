import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ImoBot — Dashboard de Leads",
  description: "Bot Imobiliário com qualificação automática de leads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
