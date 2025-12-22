// Archivo: dapp/app/layout.tsx
import type { Metadata } from "next";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./globals.css";
import { WalletProvider } from "../contexts/MetaMaskContext";
import { ThemeProvider } from "../contexts/ThemeContext";

export const metadata: Metadata = {
  title: "ETH Doc Registry",
  description: "Decentralized document verification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}