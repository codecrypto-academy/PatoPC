import 'dotenv/config';
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Configuration (support NEXT_PUBLIC_* names from .env.local)
const DAO_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const FORWARDER_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const RELAYER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = "http://127.0.0.1:8545";
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || "30000"); // 30 seconds

const DAO_ABI = [
  "function getProposalCount() external view returns (uint256)",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, string title, string description, address recipient, uint256 amount, uint256 deadline, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, bool executed, uint256 executionTime))",
  "function executeProposal(uint256 proposalId) external",
];

interface Proposal {
  id: number;
  title: string;
  description: string;
  recipient: string;
  amount: bigint;
  deadline: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  executed: boolean;
  executionTime: number;
}

const SECURITY_PERIOD = 2 * 24 * 60 * 60; // 2 days in seconds
const LOG_FILE = path.join(process.cwd(), "daemon.log");

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage, { encoding: "utf-8" });
}

async function executeEligibleProposals() {
  try {
    if (!DAO_ADDRESS || !RELAYER_PRIVATE_KEY || !RPC_URL) {
      log("ERROR: Missing required environment variables");
      return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, relayer);

    const currentTime = Math.floor(Date.now() / 1000);
    const proposalCount = await contract.getProposalCount();

    log(`Checking ${proposalCount} proposals...`);

    for (let i = 1; i <= proposalCount; i++) {
      try {
        const proposal: Proposal = await contract.getProposal(i);

        // Check if proposal is eligible for execution
        if (
          !proposal.executed &&
          proposal.deadline < currentTime &&
          currentTime >= proposal.deadline + SECURITY_PERIOD &&
          proposal.votesFor > proposal.votesAgainst
        ) {
          log(
            `Executing proposal ${i}: ${proposal.amount} wei to ${proposal.recipient}`
          );

          const tx = await contract.executeProposal(i);
          const receipt = await tx.wait();

          log(
            `✓ Proposal ${i} executed in tx ${receipt?.hash}. Gas used: ${receipt?.gasUsed}`
          );
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        log(`ERROR executing proposal ${i}: ${errorMsg}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log(`ERROR in execution loop: ${errorMsg}`);
  }
}

async function main() {
  log("DAO Execution Daemon started");
  log(`Configuration:`);
  log(`  DAO Address: ${DAO_ADDRESS}`);
  log(`  RPC URL: ${RPC_URL}`);
  log(`  Check Interval: ${CHECK_INTERVAL}ms`);
  log(`  Security Period: ${SECURITY_PERIOD} seconds`);

  // Run immediately on start
  await executeEligibleProposals();

  // Then run at intervals
  setInterval(executeEligibleProposals, CHECK_INTERVAL);
}

main().catch((error) => {
  log(`FATAL ERROR: ${error}`);
  process.exit(1);
});
