import { ethers } from "ethers";
import {
  ForwardRequest,
  VoteType,
  DOMAIN_SEPARATOR,
  FORWARD_REQUEST_TYPE,
} from "@/types";

/**
 * Generate EIP-712 signature for a vote
 */
export async function signVoteMetaTransaction(
  signer: ethers.Signer,
  forwarderAddress: string,
  daoAddress: string,
  proposalId: number,
  voteType: VoteType,
  nonce: number
): Promise<{ request: ForwardRequest; signature: string }> {
  const daoInterface = new ethers.Interface(["function vote(uint256 proposalId, uint8 voteType)"]);
  const data = daoInterface.encodeFunctionData("vote", [proposalId, voteType]);

  const chainId = await signer.provider?.getNetwork().then((n) => n.chainId);
  if (!chainId) throw new Error("Could not get chain ID");

  const forwardRequest: ForwardRequest = {
    from: await signer.getAddress(),
    to: daoAddress,
    value: "0",
    gas: "100000",
    nonce,
    data,
  };

  const domain = {
    name: DOMAIN_SEPARATOR.name,
    version: DOMAIN_SEPARATOR.version,
    chainId,
    verifyingContract: forwarderAddress,
  };

  const types = FORWARD_REQUEST_TYPE;

  const signature = await signer.signTypedData(domain, types, forwardRequest);

  return { request: forwardRequest, signature };
}

/**
 * Submit vote to relayer
 */
export async function submitVoteToRelayer(
  request: ForwardRequest,
  signature: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch("/api/relay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        request,
        signature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Relay failed" };
    }

    return { success: true, txHash: data.txHash };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Perform gasless vote (sign + relay)
 */
export async function castGaslessVote(
  signer: ethers.Signer,
  forwarderAddress: string,
  daoAddress: string,
  proposalId: number,
  voteType: VoteType,
  nonce: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { request, signature } = await signVoteMetaTransaction(
      signer,
      forwarderAddress,
      daoAddress,
      proposalId,
      voteType,
      nonce
    );

    return await submitVoteToRelayer(request, signature);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
