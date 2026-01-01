export enum VoteType {
  FOR = 0,
  AGAINST = 1,
  ABSTAIN = 2,
}

export enum ProposalState {
  PENDING = 0,
  ACTIVE = 1,
  APPROVED = 2,
  REJECTED = 3,
  EXECUTED = 4,
}

export interface Proposal {
  id: number;
  recipient: string;
  amount: bigint;
  deadline: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  executed: boolean;
  executionTime: number;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: string;
  chainId: number | null;
}

export interface ForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: number;
  data: string;
}

export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}
export interface RelayResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Configuración del dominio EIP-712
// El nombre debe coincidir con el nombre definido en tu contrato inteligente MinimalForwarder
export const DOMAIN_SEPARATOR = {
  name: "MinimalForwarder", 
  version: "0.0.1",
};

// Definición de tipos para EIP-712
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

export interface Proposal {
  id: number;
  recipient: string;
  amount: bigint;
  deadline: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  executed: boolean;
  executionTime: number;
}