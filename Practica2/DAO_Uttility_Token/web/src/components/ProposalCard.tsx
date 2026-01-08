"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/context/Web3Context";
import { DAO_ABI } from "@/services/contracts";
import { castGaslessVote } from "@/services/meta-transactions";
import { Proposal, VoteType, ProposalState } from "@/types";

interface ProposalCardProps {
  proposal: Proposal;
  daoAddress: string;
  forwarderAddress: string;
  userVoted: boolean;
  userVoteType?: VoteType;
  onVoteSuccess?: () => void;
}

type PaymentMethod = "gasless" | "standard";

export function ProposalCard({
  proposal,
  daoAddress,
  forwarderAddress,
  userVoted,
  userVoteType,
  onVoteSuccess,
}: ProposalCardProps) {
  const { signer, wallet } = useWeb3();
  const [isVoting, setIsVoting] = useState(false);
  const [votingType, setVotingType] = useState<VoteType | null>(null);
  const [voteMessage, setVoteMessage] = useState("");
  const [state, setState] = useState<ProposalState>(ProposalState.ACTIVE);
  
  // Nuevo estado para el método de pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gasless");

  useEffect(() => {
    const fetchState = async () => {
      if (!wallet.isConnected) return;
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );
        const contract = new ethers.Contract(daoAddress, DAO_ABI, provider);
        const stateValue = await contract.getProposalState(proposal.id);
        
        // CORRECCIÓN CRÍTICA: Convertir BigInt a Number
        setState(Number(stateValue));
      } catch (error) {
        console.error("Error fetching proposal state:", error);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [proposal.id, daoAddress, wallet.isConnected]);

  // Función auxiliar para verificar saldo en DAO antes de votar
  const checkDaoBalance = async (): Promise<boolean> => {
    if (!wallet.address) return false;
    try {
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
      const contract = new ethers.Contract(daoAddress, DAO_ABI, provider);
      const balance = await contract.getUserBalance(wallet.address);
      if (Number(balance) === 0) {
        setVoteMessage("❌ Error: You must fund the DAO to vote!");
        return false;
      }
      return true;
    } catch (e) {
      console.error("Balance check failed", e);
      return true; // Si falla la verificación, intentamos votar igual
    }
  };

  // 1. Votación Gasless (Paga el Relayer)
  const handleGaslessVote = async (voteType: VoteType) => {
    if (!signer || !wallet.isConnected) {
      setVoteMessage("Please connect wallet first");
      return;
    }

    // VERIFICACIÓN DE SALDO
    const hasBalance = await checkDaoBalance();
    if (!hasBalance) return;

    setIsVoting(true);
    setVotingType(voteType);
    setVoteMessage("Signing message (no gas cost)...");

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const forwarderContract = new ethers.Contract(
        forwarderAddress,
        ["function getNonce(address) view returns (uint256)"],
        provider
      );
      
      // SOLUCIÓN AL ERROR JSON:
      // El contrato devuelve BigInt, pero JSON.stringify falla con BigInt.
      // Convertimos a Number antes de enviar.
      const nonceBigInt = await forwarderContract.getNonce(await signer.getAddress());
      const nonce = Number(nonceBigInt);

      const result = await castGaslessVote(
        signer,
        forwarderAddress,
        daoAddress,
        Number(proposal.id), // Aseguramos que el ID también sea number
        voteType,
        nonce
      );

      if (result.success) {
        setVoteMessage("✓ Vote submitted via Relayer!");
        // Llamamos a onSuccess inmediatamente para actualizar la UI y ocultar botones
        onVoteSuccess?.();
        setTimeout(() => {
          setVoteMessage("");
        }, 3000);
      } else {
        // Manejo de error más amigable
        if (result.error?.includes("reverted") || result.error?.includes("CALL_EXCEPTION")) {
             setVoteMessage("Error: Transaction failed. You may have already voted or have no voting power.");
        } else {
             setVoteMessage(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      setVoteMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsVoting(false);
      setVotingType(null);
    }
  };

  // 2. Votación Estándar (Paga el usuario)
  const handleStandardVote = async (voteType: VoteType) => {
    if (!signer || !wallet.isConnected) {
      setVoteMessage("Please connect wallet first");
      return;
    }

    // VERIFICACIÓN DE SALDO
    const hasBalance = await checkDaoBalance();
    if (!hasBalance) return;

    setIsVoting(true);
    setVotingType(voteType);
    setVoteMessage("Please confirm transaction in wallet...");

    try {
      const contract = new ethers.Contract(daoAddress, DAO_ABI, signer);
      
      // Llamada directa al contrato
      const tx = await contract.vote(proposal.id, voteType);
      
      setVoteMessage("Transaction submitted. Waiting for confirmation...");
      await tx.wait();

      setVoteMessage("✓ Vote confirmed on-chain!");
      onVoteSuccess?.(); // Actualizar UI inmediatamente
      setTimeout(() => {
        setVoteMessage("");
      }, 3000);
    } catch (error) {
        console.error(error);
        const errMessage = error instanceof Error ? error.message : "Transaction failed";
        if (errMessage.includes("Already voted")) {
             setVoteMessage("Error: You have already voted on this proposal.");
        } else {
             setVoteMessage(`Error: ${errMessage}`);
        }
    } finally {
      setIsVoting(false);
      setVotingType(null);
    }
  };

  // 3. Router de votación
  const handleVote = (voteType: VoteType) => {
    if (paymentMethod === "gasless") {
      handleGaslessVote(voteType);
    } else {
      handleStandardVote(voteType);
    }
  };

  const isActive = state === ProposalState.ACTIVE;
  // Corrección BigInt para la fecha
  const deadline = new Date(Number(proposal.deadline) * 1000);
  const isOverdue = Date.now() > deadline.getTime();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          {/* Corrección BigInt para ID */}
          <h3 className="text-xl font-bold">Proposal #{proposal.id.toString()}</h3>
          <p className="text-gray-600 font-mono text-sm">
            To: {proposal.recipient.slice(0, 6)}...{proposal.recipient.slice(-4)}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            state === ProposalState.EXECUTED
              ? "bg-green-100 text-green-800"
              : state === ProposalState.APPROVED
              ? "bg-blue-100 text-blue-800"
              : state === ProposalState.REJECTED
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {ProposalState[state]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-600 text-sm">Amount</p>
          <p className="text-lg font-bold">{parseFloat(ethers.formatEther(proposal.amount)).toFixed(4)} ETH</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">Deadline</p>
          <p className="text-sm">{deadline.toLocaleString()}</p>
          {isOverdue && <p className="text-red-600 text-xs">Overdue</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 bg-gray-50 p-4 rounded">
        {/* Corrección BigInt para Votos */}
        <div className="text-center">
          <p className="text-gray-600 text-xs">FOR</p>
          <p className="text-lg font-bold text-green-600">{proposal.votesFor.toString()}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-xs">AGAINST</p>
          <p className="text-lg font-bold text-red-600">{proposal.votesAgainst.toString()}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-xs">ABSTAIN</p>
          <p className="text-lg font-bold text-gray-600">{proposal.votesAbstain.toString()}</p>
        </div>
      </div>

      {userVoted && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-sm">
          ✓ You voted {VoteType[userVoteType || 0]}
        </div>
      )}

      {/* SECCIÓN DE VOTACIÓN */}
      {isActive && !userVoted && wallet.isConnected && (
        <div className="border-t pt-4 mt-4">
          
          {/* Selector de Método de Pago */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Who pays for gas?</p>
            <div className="flex gap-4">
              <label 
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded border cursor-pointer transition ${
                  paymentMethod === 'gasless' 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="radio" 
                  name={`payment-${proposal.id}`}
                  checked={paymentMethod === 'gasless'}
                  onChange={() => setPaymentMethod('gasless')}
                  className="hidden"
                />
                <span>⚡ Relayer (Gasless)</span>
              </label>

              <label 
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded border cursor-pointer transition ${
                  paymentMethod === 'standard' 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="radio" 
                  name={`payment-${proposal.id}`}
                  checked={paymentMethod === 'standard'}
                  onChange={() => setPaymentMethod('standard')}
                  className="hidden"
                />
                <span>⛽ Me (Standard)</span>
              </label>
            </div>
          </div>

          {/* Botones de Voto */}
          <div className="flex gap-2">
            <button
              onClick={() => handleVote(VoteType.FOR)}
              disabled={isVoting}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition text-sm font-medium"
            >
              {isVoting && votingType === VoteType.FOR ? "Voting..." : "Vote For"}
            </button>
            <button
              onClick={() => handleVote(VoteType.AGAINST)}
              disabled={isVoting}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition text-sm font-medium"
            >
              {isVoting && votingType === VoteType.AGAINST ? "Voting..." : "Vote Against"}
            </button>
            <button
              onClick={() => handleVote(VoteType.ABSTAIN)}
              disabled={isVoting}
              className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition text-sm font-medium"
            >
              {isVoting && votingType === VoteType.ABSTAIN ? "Voting..." : "Abstain"}
            </button>
          </div>
        </div>
      )}

      {voteMessage && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            voteMessage.includes("Error")
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {voteMessage}
        </div>
      )}
    </div>
  );
}