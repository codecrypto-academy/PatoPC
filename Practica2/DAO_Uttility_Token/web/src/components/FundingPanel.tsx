"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/context/Web3Context";
import { DAO_ABI } from "@/services/contracts";

interface FundingPanelProps {
  daoAddress: string;
  userDAOBalance: string;
  totalDAOBalance: string;
  walletBalance: string; // <--- NUEVA LÍNEA: Ahora el componente acepta este dato
  onSuccess?: () => void;
}

export function FundingPanel({
  daoAddress,
  userDAOBalance,
  totalDAOBalance,
  walletBalance, // <--- NUEVO: Destructura la variable para usarla
  onSuccess,
}: FundingPanelProps) {
  const { signer, wallet } = useWeb3();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !wallet.isConnected) {
      setMessage("Please connect wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(daoAddress, DAO_ABI, signer);
      const tx = await contract.fundDAO({
        value: ethers.parseEther(amount),
      });
      setMessage("Transaction submitted. Waiting for confirmation...");

      await tx.wait();
      setMessage("✓ Successfully funded the DAO!");
      setAmount("");
      setTimeout(() => setMessage(""), 3000);
      onSuccess?.();
    } catch (error) {
      setMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Fund DAO</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* 3. USA LA VARIABLE EN LA VISTA */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <p className="text-sm text-gray-400">Wallet Balance</p>
          <p className="text-lg font-mono font-bold text-white">
            {parseFloat(walletBalance).toFixed(4)} ETH {/* <--- Aquí mostramos el saldo real de MetaMask */}
          </p>
        </div>

        <div className="bg-gray-800/50 p-3 rounded-lg">
          <p className="text-sm text-gray-400">DAO Balance</p>
           {/* Este es el saldo que el usuario ya depositó en el contrato (si aplica) */}
          <p className="text-lg font-mono font-bold text-white">
            {parseFloat(userDAOBalance).toFixed(4)} ETH
          </p>
        </div>
      </div>

      <form onSubmit={handleFund} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Amount (ETH)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !amount || !wallet.isConnected}
          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
        >
          {isLoading ? "Processing..." : "Fund DAO"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            message.includes("Error")
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
