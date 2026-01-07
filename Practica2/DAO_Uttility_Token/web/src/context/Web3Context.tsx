"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { ethers } from "ethers";
import { WalletState } from "@/types";

// CONSTANTES DE TU RED LOCAL
const LOCAL_CHAIN_ID = 31337;
const LOCAL_CHAIN_HEX = "0x7a69"; // 31337 en Hexadecimal
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

interface Web3ContextType {
  wallet: WalletState;
  accounts: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  switchAccount: (account: string) => Promise<void>;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  isLoading: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: "0",
    chainId: null,
  });
  const [accounts, setAccounts] = useState<string[]>([]);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Función para forzar el cambio de red
  const ensureLocalNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      // Intentar cambiar a la red local
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: LOCAL_CHAIN_HEX }],
      });
    } catch (switchError: any) {
      // El código 4902 significa que la red no existe en MetaMask y hay que agregarla
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: LOCAL_CHAIN_HEX,
                chainName: "Anvil Localhost",
                rpcUrls: [RPC_URL],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error("No se pudo agregar la red local:", addError);
        }
      } else {
        console.error("No se pudo cambiar de red:", switchError);
      }
    }
  };

  const updateWalletState = useCallback(
    async (addr: string, prov: ethers.Provider) => {
      try {
        const network = await prov.getNetwork();
        const chainId = Number(network.chainId);

        console.log("DEBUG: Chain ID detectado:", chainId);

        // Si no estamos en la red local, recargar o avisar (pero intentaremos forzarlo antes)
        
        const balance = await prov.getBalance(addr);
        const newSigner = await (prov as ethers.BrowserProvider).getSigner(addr);

        setWallet({
          address: addr,
          isConnected: true,
          balance: ethers.formatEther(balance),
          chainId: chainId,
        });
        setSigner(newSigner);
      } catch (error) {
        console.error("Error updating wallet state:", error);
      }
    },
    []
  );

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not detected");
      }

      // 1. PRIMERO: Forzamos la conexión a la red correcta
      await ensureLocalNetwork();

      const requestedAccounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccounts(requestedAccounts);

      // Reinicializamos el provider después de asegurar la red
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);

      if (requestedAccounts.length > 0) {
        await updateWalletState(requestedAccounts[0], prov);
      }
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateWalletState]);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      balance: "0",
      chainId: null,
    });
    setAccounts([]);
    setProvider(null);
    setSigner(null);
  }, []);

  const switchAccount = useCallback(
    async (account: string) => {
      if (provider) {
        setIsLoading(true);
        await updateWalletState(account, provider);
        setIsLoading(false);
      }
    },
    [provider, updateWalletState]
  );

  // Detectar cambios de red y recargar
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = () => {
        // Recargar la página es la práctica recomendada por MetaMask al cambiar de red
        window.location.reload();
      };

      const handleAccountsChanged = async (newAccounts: string[]) => {
          if (newAccounts.length === 0) {
            disconnect();
          } else if (provider) {
            setAccounts(newAccounts);
            // Check if the currently connected account is still in the list
            const currentAddress = wallet.address;
            if (!newAccounts.includes(currentAddress!)) {
              // If not, switch to the first available account
              await updateWalletState(newAccounts[0], provider);
            }
          }
        };

      window.ethereum.on("chainChanged", handleChainChanged);
      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [provider, disconnect, updateWalletState, wallet.address]); // Agregué dependencias

  // Check inicial
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!window.ethereum) return;

        // Verificar si ya estamos conectados
        const availableAccounts = await window.ethereum.request({
            method: "eth_accounts",
        });

        if (availableAccounts.length > 0) {
           // Si estamos conectados, validar red
           const chainId = await window.ethereum.request({ method: 'eth_chainId' });
           
           if (chainId !== LOCAL_CHAIN_HEX) {
               console.log("Red incorrecta detectada al inicio. Cambiando...");
               await ensureLocalNetwork();
           }

          setAccounts(availableAccounts);
          const prov = new ethers.BrowserProvider(window.ethereum);
          setProvider(prov);
          await updateWalletState(availableAccounts[0], prov);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    };

    checkConnection();
  }, [updateWalletState]);

  return (
    <Web3Context.Provider
      value={{
        wallet,
        accounts,
        connect,
        disconnect,
        switchAccount,
        provider,
        signer,
        isLoading,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within Web3Provider");
  }
  return context;
}