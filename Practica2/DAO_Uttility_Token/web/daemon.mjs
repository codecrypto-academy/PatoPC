import 'dotenv/config';
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// Environment fallbacks: accept both DAO_ADDRESS and NEXT_PUBLIC_DAO_ADDRESS
const DAO_ADDRESS = process.env.DAO_ADDRESS || process.env.NEXT_PUBLIC_DAO_ADDRESS || "";
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS || process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY || "";
const RPC_URL = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || "30000", 10); // default 30s

const DAO_ABI = [
  "function getProposalCount() external view returns (uint256)",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address recipient, uint256 amount, uint256 deadline, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, bool executed, uint256 executionTime))",
  "function executeProposal(uint256 proposalId) external",
];

const SECURITY_PERIOD = 2 * 24 * 60 * 60; // 2 days in seconds
const LOG_FILE = path.join(process.cwd(), "daemon.log");

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage, { encoding: "utf-8" });
  } catch (e) {
    // ignore file write errors
  }
}

async function executeEligibleProposals() {
  try {
    if (!DAO_ADDRESS || !RELAYER_PRIVATE_KEY || !RPC_URL) {
      log("ERROR: Missing required environment variables (DAO_ADDRESS, RELAYER_PRIVATE_KEY, RPC_URL)");
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
        const p = await contract.getProposal(i);
        const proposal = {
          id: Number(p.id ?? i),
          recipient: p.recipient,
          amount: BigInt(p.amount ?? 0),
          deadline: Number(p.deadline ?? 0),
          votesFor: Number(p.votesFor ?? 0),
          votesAgainst: Number(p.votesAgainst ?? 0),
          votesAbstain: Number(p.votesAbstain ?? 0),
          executed: Boolean(p.executed),
          executionTime: Number(p.executionTime ?? 0),
        };

        if (
          !proposal.executed &&
          proposal.deadline < currentTime &&
          currentTime >= proposal.deadline + SECURITY_PERIOD &&
          proposal.votesFor > proposal.votesAgainst
        ) {
          log(`Executing proposal ${i}: ${proposal.amount} wei to ${proposal.recipient}`);

          const tx = await contract.executeProposal(i);
          const receipt = await tx.wait();

          log(`✓ Proposal ${i} executed in tx ${receipt?.hash}. Gas used: ${receipt?.gasUsed}`);
        }
      } catch (error) {
        const errorMsg = error && error.message ? error.message : String(error);
        log(`ERROR executing proposal ${i}: ${errorMsg}`);
      }
    }
  } catch (error) {
    const errorMsg = error && error.message ? error.message : String(error);
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

  await executeEligibleProposals();
  setInterval(executeEligibleProposals, CHECK_INTERVAL);
}

main().catch((error) => {
  log(`FATAL ERROR: ${error && error.message ? error.message : String(error)}`);
  process.exit(1);
});
