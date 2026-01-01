"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/context/Web3Context";
import { DAO_ABI } from "@/services/contracts";

interface CreateProposalProps {
  daoAddress: string;
  userDAOBalance: string;
  totalDAOBalance: string;
  onSuccess?: () => void;
}

export function CreateProposal({
  daoAddress,
  userDAOBalance,
  totalDAOBalance,
  onSuccess,
}: CreateProposalProps) {
  const { signer, wallet } = useWeb3();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("3");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canCreateProposal =
    parseFloat(userDAOBalance) >=
    parseFloat(totalDAOBalance) * 0.1;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !wallet.isConnected) {
      setMessage("Please connect wallet first");
      return;
    }

    if (!canCreateProposal) {
      setMessage("Insufficient balance to create proposal (need ≥10% of DAO)");
      return;
    }

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(daoAddress, DAO_ABI, signer);
      const deadline = Math.floor(Date.now() / 1000) + parseInt(days) * 86400;

      const tx = await contract.createProposal(
        recipient,
        ethers.parseEther(amount),
        deadline
      );
      setMessage("Transaction submitted. Waiting for confirmation...");

      await tx.wait();
      setMessage("✓ Proposal created successfully!");
      setRecipient("");
      setAmount("");
      setDays("3");
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
      <h2 className="text-2xl font-bold mb-4">Create Proposal</h2>

      {!canCreateProposal && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
          ⚠️ You need at least 10% of DAO balance to create proposals
          <br />
          Required: {(parseFloat(totalDAOBalance) * 0.1).toFixed(4)} ETH
          <br />
          Your balance: {parseFloat(userDAOBalance).toFixed(4)} ETH
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

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

        <div>
          <label className="block text-sm font-medium mb-2">Voting Days</label>
          <input
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={
            isLoading || !recipient || !amount || !wallet.isConnected || !canCreateProposal
          }
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {isLoading ? "Creating..." : "Create Proposal"}
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
