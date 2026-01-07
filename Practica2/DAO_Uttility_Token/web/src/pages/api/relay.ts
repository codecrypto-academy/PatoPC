import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import { ForwardRequest } from "@/types";

// Check environment variables
const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

const FORWARDER_ABI = [
  "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) public payable returns (bool success, bytes memory result)",
];

export const config = {
  api: {
    bodyParser: true, // Habilitar el parseo automático del body
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("--- RELAYER API CALLED (Pages Router) ---");

  // Verificar método HTTP
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Env Vars Check
    console.log("1. Checking Environment Variables...");
    if (!FORWARDER_ADDRESS || !RELAYER_PRIVATE_KEY) {
      console.error("ERROR: Missing Env Vars");
      return res.status(500).json({ error: "Relayer not properly configured" });
    }
    console.log("   Env Vars OK.");

    // 2. Body Parsing (Automático en Pages Router)
    console.log("2. Reading Request Body...");
    const body = req.body;
    console.log("   Body received:", JSON.stringify(body, null, 2));

    const { request, signature } = body as {
      request: ForwardRequest;
      signature: string;
    };

    if (!request || !signature) {
      console.error("ERROR: Missing request or signature");
      return res.status(400).json({ error: "Missing request or signature" });
    }

    // 3. Validation
    console.log("3. Validating Request Format...");
    if (
      !request.from ||
      !request.to ||
      // En req.body, a veces los números llegan como numbers o strings dependiendo del cliente
      (typeof request.value !== "string" && typeof request.value !== "number") ||
      (typeof request.gas !== "string" && typeof request.gas !== "number") ||
      typeof request.nonce !== "number" ||
      !request.data
    ) {
      console.error("ERROR: Invalid format. Request:", request);
      return res.status(400).json({ error: "Invalid request format" });
    }
    console.log("   Format OK.");

    // 4. Provider Connection
    console.log("4. Connecting to Provider:", RPC_URL);
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Test provider connection
    const network = await provider.getNetwork();
    console.log("   Connected to network:", network.chainId.toString());

    const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    console.log("   Relayer Address:", await relayer.getAddress());

    // 5. Contract Setup
    console.log("5. Instantiating Contract at:", FORWARDER_ADDRESS);
    const forwarderContract = new ethers.Contract(
      FORWARDER_ADDRESS,
      FORWARDER_ABI,
      relayer
    );

    // 6. Execution
    console.log("6. Executing Transaction...");
    
    // Aseguramos que value y gas sean strings para ethers
    const tx = await forwarderContract.execute(
      {
        from: request.from,
        to: request.to,
        value: request.value.toString(),
        gas: request.gas.toString(),
        nonce: request.nonce,
        data: request.data,
      },
      signature,
      {
        gasLimit: 500000, // Hardcoded limit for safety
      }
    );
    console.log("   Tx Sent! Hash:", tx.hash);

    // 7. Wait for Receipt
    console.log("7. Waiting for confirmation...");
    const receipt = await tx.wait();

    if (!receipt) {
      console.error("ERROR: No receipt returned");
      return res.status(500).json({ error: "Transaction failed" });
    }
    console.log("   Tx Confirmed in block:", receipt.blockNumber.toString());

    // 8. Response
    const responseData = {
      success: true,
      txHash: receipt.hash,
      // CRÍTICO: Convertir BigInt a String para evitar error JSON
      blockNumber: receipt.blockNumber.toString(),
    };
    console.log("8. Sending Response:", responseData);

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("CRITICAL RELAY ERROR:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return res.status(500).json({ error: `Relay failed: ${errorMessage}` });
  }
}