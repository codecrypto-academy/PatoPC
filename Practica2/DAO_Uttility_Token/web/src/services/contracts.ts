import { ethers } from "ethers";

// MinimalForwarder ABI
export const FORWARDER_ABI = [
  "function getNonce(address from) public view returns (uint256)",
  "function verify(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) public view returns (bool)",
  "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) public payable returns (bool success, bytes memory result)",
];

// DAOVoting ABI
export const DAO_ABI = [
  "function fundDAO() external payable",
  "function createProposal(address recipient, uint256 amount, uint256 deadline) external",
  "function vote(uint256 proposalId, uint8 voteType) external",
  "function changeVote(uint256 proposalId, uint8 voteType) external",
  "function executeProposal(uint256 proposalId) external",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address recipient, uint256 amount, uint256 deadline, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, bool executed, uint256 executionTime))",
  "function getProposalState(uint256 proposalId) external view returns (uint8)",
  "function getUserBalance(address user) external view returns (uint256)",
  "function getProposalCount() external view returns (uint256)",
  "function getUserVote(uint256 proposalId, address user) external view returns (bool voted, uint8 voteType)",
  "function totalDAOBalance() external view returns (uint256)",
];

// ERC2771Context domain separator (for EIP-712)
export const DOMAIN_SEPARATOR = {
  name: "MinimalForwarder",
  version: "0.0.1", // CRÍTICO: OpenZeppelin v4 usa 0.0.1
  // salt: ELIMINADO. OpenZeppelin MinimalForwarder NO usa salt por defecto.
};

export const FORWARD_REQUEST_TYPE = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
  ],
};