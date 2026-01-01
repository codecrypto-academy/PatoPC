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

  const updateWalletState = useCallback(
    async (addr: string, prov: ethers.Provider) => {
      try {
        const balance = await prov.getBalance(addr);
        const network = await prov.getNetwork();
        const newSigner = await (prov as ethers.BrowserProvider).getSigner(
          addr
        );

        setWallet({
          address: addr,
          isConnected: true,
          balance: ethers.formatEther(balance),
          chainId: Number(network.chainId),
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

      const requestedAccounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccounts(requestedAccounts);

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

  useEffect(() => {
    if (window.ethereum) {
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

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum?.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [provider, disconnect, updateWalletState, wallet.address]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!window.ethereum) return;

        const availableAccounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (availableAccounts.length > 0) {
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
