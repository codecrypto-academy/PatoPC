// Definición ÚNICA y CORRECTA que coincide con Solidity
// En Solidity: enum VoteType { FOR, AGAINST, ABSTAIN } -> 0, 1, 2
export enum VoteType {
  FOR = 0,
  AGAINST = 1,
  ABSTAIN = 2
}

export enum ProposalState {
  PENDING = 0,
  ACTIVE = 1,
  APPROVED = 2,
  REJECTED = 3,
  EXECUTED = 4
}

export interface Proposal {
  id: number;
  title: string;       // <--- NUEVO: Requerido para corregir tu error
  description: string; // <--- NUEVO: Requerido para corregir tu error
  recipient: string;
  // Usamos string para montos en frontend para evitar problemas de serialización de BigInt en props
  amount: string; 
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

export interface RelayResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}