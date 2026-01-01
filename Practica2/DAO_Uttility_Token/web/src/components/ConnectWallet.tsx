import React from "react";
import { useWeb3 } from "@/context/Web3Context";

export function ConnectWallet() {
  const { wallet, accounts, connect, disconnect, switchAccount, isLoading } =
    useWeb3();

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchAccount(e.target.value);
  };

  return (
    <div className="flex items-center gap-4">
      {!wallet.isConnected ? (
        <button
          onClick={connect}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <p className="text-gray-600">Connected</p>
            {accounts.length > 1 ? (
              <select
                value={wallet.address || ""}
                onChange={handleAccountChange}
                className="font-mono text-sm bg-gray-200 border-gray-300 rounded"
              >
                {accounts.map((account) => (
                  <option key={account} value={account}>
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-mono text-sm">
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
              </p>
            )}
            <p className="text-gray-600">
              {parseFloat(wallet.balance).toFixed(4)} ETH
            </p>
          </div>
          <button
            onClick={disconnect}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
