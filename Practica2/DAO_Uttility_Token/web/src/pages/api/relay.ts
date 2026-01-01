import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { ForwardRequest } from "@/types";

// Check environment variables
const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

const FORWARDER_ABI = [
  "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) public payable returns (bool success, bytes memory result)",
];

export async function POST(req: NextRequest) {
  try {
    // Check if environment variables are set
    if (!FORWARDER_ADDRESS || !RELAYER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Relayer not properly configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { request, signature } = body as {
      request: ForwardRequest;
      signature: string;
    };

    if (!request || !signature) {
      return NextResponse.json(
        { error: "Missing request or signature" },
        { status: 400 }
      );
    }

    // Validate request format
    if (
      !request.from ||
      !request.to ||
      typeof request.value !== "string" ||
      typeof request.gas !== "string" ||
      typeof request.nonce !== "number" ||
      !request.data
    ) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Connect relayer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

    // Create forwarder contract instance
    const forwarderContract = new ethers.Contract(
      FORWARDER_ADDRESS,
      FORWARDER_ABI,
      relayer
    );

    // Execute meta-transaction
    const tx = await forwarderContract.execute(
      {
        from: request.from,
        to: request.to,
        value: request.value,
        gas: request.gas,
        nonce: request.nonce,
        data: request.data,
      },
      signature,
      {
        gasLimit: 500000,
      }
    );

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Relay error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Relay failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
