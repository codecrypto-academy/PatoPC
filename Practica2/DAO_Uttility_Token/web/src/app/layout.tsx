import type { Metadata } from "next";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

export const metadata: Metadata = {
  title: "DAO Voting - Gasless Voting",
  description: "Decentralized voting system with gasless meta-transactions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Agregamos suppressHydrationWarning aquí para ignorar los cambios de tu extensión
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}