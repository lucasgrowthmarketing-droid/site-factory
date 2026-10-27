import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import "./workspace.css";
export const metadata: Metadata = {
  title: "SiteFactory — Da oportunidade à presença digital",
  description: "Prospecte, qualifique e crie demonstrações comerciais.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
