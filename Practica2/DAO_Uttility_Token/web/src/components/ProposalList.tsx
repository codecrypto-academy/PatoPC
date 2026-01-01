"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/context/Web3Context";
import { DAO_ABI } from "@/services/contracts";
import { ProposalCard } from "./ProposalCard";
import { Proposal, VoteType } from "@/types";

interface ProposalListProps {
  daoAddress: string;
  forwarderAddress: string;
  refreshTrigger?: number;
}

export function ProposalList({
  daoAddress,
  forwarderAddress,
  refreshTrigger,
}: ProposalListProps) {
  const { wallet } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotes, setUserVotes] = useState<
    Map<number, { voted: boolean; voteType: VoteType }>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchProposals = async () => {
    if (!wallet.isConnected) return;

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const contract = new ethers.Contract(daoAddress, DAO_ABI, provider);

      const count = await contract.getProposalCount();
      const proposalsList: Proposal[] = [];
      const votes = new Map<number, { voted: boolean; voteType: VoteType }>();

      for (let i = 1; i <= count; i++) {
        const proposal = await contract.getProposal(i);
        proposalsList.push({
          id: proposal.id,
          recipient: proposal.recipient,
          amount: proposal.amount.toString(),
          deadline: proposal.deadline,
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst,
          votesAbstain: proposal.votesAbstain,
          executed: proposal.executed,
          executionTime: proposal.executionTime,
        });

        // Get user's vote
        const userVote = await contract.getUserVote(i, wallet.address);
        votes.set(i, {
          voted: userVote[0],
          voteType: userVote[1],
        });
      }

      setProposals(proposalsList.reverse());
      setUserVotes(votes);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 10000);
    return () => clearInterval(interval);
  }, [wallet.isConnected, wallet.address, refreshTrigger]);

  if (isLoading && proposals.length === 0) {
    return <div className="text-center py-8">Loading proposals...</div>;
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No proposals yet. Be the first to create one!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Proposals</h2>
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          daoAddress={daoAddress}
          forwarderAddress={forwarderAddress}
          userVoted={userVotes.get(proposal.id)?.voted || false}
          userVoteType={userVotes.get(proposal.id)?.voteType}
          onVoteSuccess={fetchProposals}
        />
      ))}
    </div>
  );
}
