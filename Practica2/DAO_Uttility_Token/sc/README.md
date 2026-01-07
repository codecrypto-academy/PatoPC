# DAO Voting Smart Contracts (Foundry)

## Overview

This directory contains the Solidity smart contracts for a gasless DAO voting system using EIP-2771 meta-transactions.

## Contracts

### 1. MinimalForwarder.sol
Implements the EIP-2771 standard for meta-transactions.

**Key Features:**
- Signature verification using ECDSA
- Nonce management per user for replay attack prevention
- Execution of meta-transactions on behalf of users
- Relayer pattern for paying gas on behalf of users

**Methods:**
- `getNonce(address)`: Get current nonce for a user
- `verify(ForwardRequest, bytes)`: Verify a meta-transaction signature
- `execute(ForwardRequest, bytes)`: Execute a verified meta-transaction

### 2. DAOVoting.sol
Main DAO contract inheriting from ERC2771Context.

**Key Features:**
- Proposal creation with fund transfers
- Multi-type voting system (FOR, AGAINST, ABSTAIN)
- Automatic proposal execution after voting period
- User balance tracking
- Minimum balance requirement (10%) for proposal creation
- Security period after voting deadline before execution

**Methods:**
- `fundDAO()`: Deposit ETH into the DAO
- `createProposal(address, uint256, uint256)`: Create a new proposal
- `vote(uint256, VoteType)`: Cast a vote on a proposal
- `changeVote(uint256, VoteType)`: Change vote before deadline
- `executeProposal(uint256)`: Execute an approved proposal
- `getProposal(uint256)`: Get proposal details
- `getProposalState(uint256)`: Get current proposal state
- `getUserBalance(address)`: Get user's DAO balance

## Setup

### Prerequisites
- Foundry (see: https://book.getfoundry.sh/getting-started/installation)
- Git

### Installation

```bash
cd sc
forge install OpenZeppelin/openzeppelin-contracts
```

## Compilation

```bash
forge build
```

## Testing

Run all tests:
```bash
forge test
```

Run specific test file:
```bash
forge test --match-path test/DAOVoting.t.sol
```

Run with verbosity:
```bash
forge test -vv
```

Generate coverage:
```bash
forge coverage
```

## Deployment

### Local Deployment (Anvil)

Start local node:
```bash
anvil
```

In another terminal, deploy contracts:
```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### Testnet Deployment

```bash
export PRIVATE_KEY=your_private_key
forge script script/Deploy.s.sol --rpc-url your_rpc_url --broadcast
forge script script/Deploy.s.sol --rpc-url 127.0.0.1:8545 --broadcast

```

## Contract Addresses

After deployment, contracts will be output with their addresses. These should be added to the frontend `.env.local` file.
COPY AND PASTE WITH THIS SECUENCE
NEXT_PUBLIC_DAO_ADDRESS= PEGA_AQUI_LA_DIRECCION_DE_DAOVOTING
NEXT_PUBLIC_FORWARDER_ADDRESS=PEGA_AQUI_LA_DIRECCION_DE_MINIMALFORWARDER
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
EOF

En otro terminal:
# Archivo: web/.env (Genera un nuevo archivo .env para el daemon) con esta información
# Inicio Archivo .env
DAO_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Para Next.js (Frontend) - Opcional si ya están en .env.local
NEXT_PUBLIC_DAO_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
# Fin del Archivo .env


export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Despliega
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

Configurar la red personalizada en Metamask con la IP obtenida (http://127.0.0.1:8545)
Chain ID: 31337
Agregar Billetera --> Importar cuenta --> ingresar clave privada

### EIP-2771 Meta-Transaction Flow

1. **User Signs Off-Chain:**
   - User creates a `ForwardRequest` with their intended action
   - User signs the request using EIP-712 signature

2. **Relayer Submits:**
   - Relayer receives signed request
   - Relayer calls `execute()` on MinimalForwarder
   - Relayer pays gas fees

3. **Forwarder Validates & Executes:**
   - MinimalForwarder verifies the signature
   - MinimalForwarder checks nonce matches
   - MinimalForwarder executes call on behalf of user
   - Nonce is incremented to prevent replay attacks

### Proposal Lifecycle

```
PENDING → ACTIVE → APPROVED/REJECTED
                        ↓ (after security period)
                     EXECUTED
```

- **PENDING**: Proposal created, waiting for voting to start
- **ACTIVE**: Within voting deadline
- **APPROVED**: Voting ended with more FOR votes than AGAINST
- **REJECTED**: Voting ended without approval
- **EXECUTED**: Funds transferred to recipient

## Gas Costs (Approximate)

- Deploy MinimalForwarder: ~300,000 gas
- Deploy DAOVoting: ~1,200,000 gas
- Create Proposal: ~80,000 gas
- Cast Vote (via forwarder): ~100,000 gas
- Execute Proposal: ~50,000 gas

## Security Considerations

1. **Replay Attack Prevention**: Using nonce per user + EIP-712 signature
2. **Signature Verification**: Using OpenZeppelin's ECDSA library
3. **Security Period**: 2-day grace period before proposal execution
4. **Minimum Balance Requirement**: 10% of DAO balance to create proposals

## Testing Coverage

Current test coverage includes:
- ✅ DAO funding
- ✅ Proposal creation with balance requirements
- ✅ Voting system (FOR, AGAINST, ABSTAIN)
- ✅ Vote changing before deadline
- ✅ Proposal execution with approval
- ✅ Edge cases (double voting, insufficient balance, etc.)
- ✅ State transitions
- ✅ Meta-transaction verification
- ✅ Replay attack prevention

Target: >80% coverage
