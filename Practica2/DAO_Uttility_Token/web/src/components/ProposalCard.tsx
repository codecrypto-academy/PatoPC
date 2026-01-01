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

  useEffect(() => {
    const fetchState = async () => {
      if (!wallet.isConnected) return;
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );
        const contract = new ethers.Contract(daoAddress, DAO_ABI, provider);
        const stateValue = await contract.getProposalState(proposal.id);
        setState(stateValue);
      } catch (error) {
        console.error("Error fetching proposal state:", error);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [proposal.id, daoAddress, wallet.isConnected]);

  const handleGaslessVote = async (voteType: VoteType) => {
    if (!signer || !wallet.isConnected) {
      setVoteMessage("Please connect wallet first");
      return;
    }

    setIsVoting(true);
    setVotingType(voteType);

    try {
      // Get current nonce
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const forwarderContract = new ethers.Contract(
        forwarderAddress,
        ["function getNonce(address) view returns (uint256)"],
        provider
      );
      const nonce = await forwarderContract.getNonce(await signer.getAddress());

      // Cast gasless vote
      const result = await castGaslessVote(
        signer,
        forwarderAddress,
        daoAddress,
        proposal.id,
        voteType,
        nonce
      );

      if (result.success) {
        setVoteMessage("✓ Vote submitted successfully!");
        setTimeout(() => {
          setVoteMessage("");
          onVoteSuccess?.();
        }, 2000);
      } else {
        setVoteMessage(`Error: ${result.error}`);
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

  const isActive = state === ProposalState.ACTIVE;
  const deadline = new Date(proposal.deadline * 1000);
  const isOverdue = Date.now() > deadline.getTime();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">Proposal #{proposal.id}</h3>
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
        <div className="text-center">
          <p className="text-gray-600 text-xs">FOR</p>
          <p className="text-lg font-bold text-green-600">{proposal.votesFor}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-xs">AGAINST</p>
          <p className="text-lg font-bold text-red-600">{proposal.votesAgainst}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 text-xs">ABSTAIN</p>
          <p className="text-lg font-bold text-gray-600">{proposal.votesAbstain}</p>
        </div>
      </div>

      {userVoted && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-sm">
          ✓ You voted {VoteType[userVoteType || 0]}
        </div>
      )}

      {isActive && !userVoted && wallet.isConnected && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleGaslessVote(VoteType.FOR)}
            disabled={isVoting}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition text-sm"
          >
            {isVoting && votingType === VoteType.FOR ? "Voting..." : "Vote For"}
          </button>
          <button
            onClick={() => handleGaslessVote(VoteType.AGAINST)}
            disabled={isVoting}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition text-sm"
          >
            {isVoting && votingType === VoteType.AGAINST ? "Voting..." : "Vote Against"}
          </button>
          <button
            onClick={() => handleGaslessVote(VoteType.ABSTAIN)}
            disabled={isVoting}
            className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition text-sm"
          >
            {isVoting && votingType === VoteType.ABSTAIN ? "Voting..." : "Abstain"}
          </button>
        </div>
      )}

      {voteMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
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
