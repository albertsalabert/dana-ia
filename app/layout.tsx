import type { Metadata } from "next";
import "./globals.css";

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "IA Corporativa";

export const metadata: Metadata = {
  title: companyName,
  description: `Asistente de IA corporativo — ${companyName}`,
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
