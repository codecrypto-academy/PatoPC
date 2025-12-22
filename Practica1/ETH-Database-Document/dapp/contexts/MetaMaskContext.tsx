// Archivo: dapp/contexts/MetaMaskContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

// Definición de tipos
type WalletAccount = {
  address: string;
  privateKey: string;
  index: number;
};

type WalletContextType = {
  wallets: WalletAccount[];
  selectedWallet: WalletAccount | null;
  provider: ethers.JsonRpcProvider | null;
  selectWallet: (index: number) => void;
  isConnected: boolean;
  // Nuevas funciones para simular MetaMask
  signMessage: (message: string | Uint8Array) => Promise<string>;
  getEthersSigner: () => Promise<ethers.Signer | null>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletAccount | null>(null);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Conectar al nodo local (Anvil)
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
      const _provider = new ethers.JsonRpcProvider(rpcUrl);
      setProvider(_provider);

      // 2. Derivar wallets desde el mnemónico
      const mnemonic = process.env.NEXT_PUBLIC_MNEMONIC || "";
      if (!mnemonic) return;

      const derivedWallets: WalletAccount[] = [];
      
      // CORRECCIÓN AQUÍ:
      // Pasamos 'undefined' como password y "m" como path inicial.
      // Esto asegura que 'hdNode' sea la raíz maestra y acepte rutas absolutas "m/..."
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m");

      for (let i = 0; i < 10; i++) {
        // Derivation path estándar para Ethereum: m/44'/60'/0'/0/i
        const path = `m/44'/60'/0'/0/${i}`;
        const wallet = hdNode.derivePath(path);
        derivedWallets.push({
          address: wallet.address,
          privateKey: wallet.privateKey,
          index: i,
        });
      }
      setWallets(derivedWallets);
    };

    init();
  }, []);

  const selectWallet = (index: number) => {
    if (wallets[index]) {
      setSelectedWallet(wallets[index]);
    }
  };

  // Simulación de "personal_sign" de MetaMask
  const signMessage = async (message: string | Uint8Array): Promise<string> => {
    if (!selectedWallet || !provider) throw new Error("No hay wallet conectada");
    
    // Instanciamos el signer internamente (la UI no ve la private key)
    const wallet = new ethers.Wallet(selectedWallet.privateKey, provider);
    return await wallet.signMessage(message);
  };

  // Obtener el objeto Signer para transacciones de contrato
  const getEthersSigner = async (): Promise<ethers.Signer | null> => {
    if (!selectedWallet || !provider) return null;
    return new ethers.Wallet(selectedWallet.privateKey, provider);
  };

  return (
    <WalletContext.Provider
      value={{
        wallets,
        selectedWallet,
        provider,
        selectWallet,
        isConnected: !!selectedWallet,
        signMessage,
        getEthersSigner
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Este es tu HOOK PRINCIPAL que simula MetaMask
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
};