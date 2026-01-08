import { ethers } from "ethers";
import { ForwardRequest, VoteType } from "@/types";
// IMPORTANTE: Importamos las constantes desde contracts.ts
import { DOMAIN_SEPARATOR, FORWARD_REQUEST_TYPE } from "@/services/contracts";

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
  
  // 1. Prepara la data forzando conversión a Number
  const daoInterface = new ethers.Interface(["function vote(uint256 proposalId, uint8 voteType)"]);
  
  // Debug log (opcional, puedes comentarlo si ya no lo necesitas)
  // console.log(`[DEBUG] Encoding Vote: ProposalID=${proposalId}, VoteType=${voteType}`);
  
  const data = daoInterface.encodeFunctionData("vote", [proposalId, Number(voteType)]);

  // 2. Obtener ChainID
  const network = await signer.provider?.getNetwork();
  const chainId = network ? Number(network.chainId) : 31337;
  
  if (!chainId) throw new Error("Could not get chain ID");

  // 3. Construir el Request
  const forwardRequest: ForwardRequest = {
    from: await signer.getAddress(),
    to: daoAddress,
    value: "0",
    gas: "300000",       
    nonce: Number(nonce), 
    data,
  };

  // 4. Dominio EIP-712
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
      const errorMsg = data.error || "Unknown Relay Error";

      // --- GESTIÓN DE ERRORES MEJORADA ---
      // Si el error es una reversión (ej: "Already voted" o "Execution reverted"),
      // lo mostramos como advertencia (warn) en lugar de error crítico.
      const isExpectedError = 
        errorMsg.includes("reverted") || 
        errorMsg.includes("CALL_EXCEPTION") ||
        errorMsg.includes("execution reverted");

      if (isExpectedError) {
        console.warn(`⚠️ Transaction Reverted (Expected logic): ${errorMsg.slice(0, 100)}...`);
      } else {
        // Errores reales de infraestructura (ej: fallo de red, API key mal, etc)
        console.error("❌ Relay Critical Error:", data);
      }

      return { success: false, error: errorMsg };
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