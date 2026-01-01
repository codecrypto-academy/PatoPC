# DAO Voting - Gasless Voting System

A complete decentralized autonomous organization (DAO) voting system with **gasless voting** using EIP-2771 meta-transactions.

## 🎯 Project Overview

This project implements a full-stack DAO voting application where:

- **Users can create proposals** without paying gas (meta-transactions)
- **Users can vote without paying gas** (gasless voting via EIP-2771)
- **Proposals are executed automatically** after voting period ends
- **Minimum balance requirement** (10% of DAO) to create proposals
- **Multi-type voting**: FOR, AGAINST, ABSTAIN
- **Security period** after voting before execution

## 📁 Project Structure

```
.
├── sc/                      # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── MinimalForwarder.sol    # EIP-2771 Forwarder
│   │   └── DAOVoting.sol           # Main DAO Contract
│   ├── test/                       # Foundry Tests
│   ├── script/                     # Deployment Scripts
│   ├── foundry.toml
│   └── README.md
│
├── web/                     # Frontend (Next.js 15)
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # React Components
│   │   ├── context/         # Web3 Context
│   │   ├── pages/api/relay  # Relayer API Route
│   │   ├── services/        # Contract & Meta-TX Services
│   │   └── types/           # TypeScript Types
│   ├── daemon.ts            # Proposal Execution Daemon
│   ├── package.json
│   └── README.md
│
├── README.md                # This file
└── .gitignore
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Foundry (for smart contracts)
- MetaMask (for frontend)
- Anvil (local blockchain node)

### 1. Smart Contracts Setup

```bash
cd sc

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts

# Build contracts
forge build

# Run tests
forge test -vv

# Generate coverage
forge coverage
```

### 2. Start Local Blockchain

```bash
# In a new terminal
anvil

# Copy the deployer private key (usually 0xac0974bec39a...)
```

### 3. Deploy Contracts

```bash
cd sc

# Export the private key from anvil
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy to local network
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Copy the deployed addresses (MinimalForwarder and DAOVoting)
```

### 4. Frontend Setup

```bash
cd web

# Install dependencies
npm install

# Create .env.local with deployed addresses
cat > .env.local << EOF
NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1f02960247590a4a3
EOF

# Start development server
npm run dev

# In another terminal, start the execution daemon
npx ts-node daemon.ts
```

### 5. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser and connect MetaMask to local Anvil network.

## 🔄 Complete Test Flow

### Scenario: 3-User DAO Voting

1. **User A deposits 10 ETH** (40% of DAO)
2. **User B deposits 5 ETH** (20% of DAO)  
3. **User C deposits 10 ETH** (40% of DAO)

Now DAO has 25 ETH total.

4. **User A creates proposal** (has >10% balance)
   - Recipient: User D
   - Amount: 5 ETH
   - Deadline: 3 days

5. **User A votes FOR** (gasless)
6. **User B votes FOR** (gasless)
7. **User C votes AGAINST** (gasless)

Result: 2 FOR vs 1 AGAINST → APPROVED

8. **Wait 3 days + 2 days (security period)**

9. **Daemon automatically executes proposal**
   - User D receives 5 ETH
   - DAO balance: 20 ETH

## 🏗️ Architecture

### Smart Contract Flow

```
User Signature → MetaTx Relay → MinimalForwarder → DAOVoting
                     ↑                               ↓
                  Verify Sig                    Execute Vote
                  Check Nonce                   Update State
```

### Voting Lifecycle

```
PENDING → ACTIVE → APPROVED/REJECTED
   ↓                    ↓
Create            Wait Deadline
              +
            SECURITY_PERIOD
                   ↓
              EXECUTED
            (Auto or Manual)
```

### Key Features

#### MinimalForwarder (EIP-2771)

- Signs meta-transactions using ECDSA
- Maintains per-user nonces (replay attack prevention)
- Relayer pattern (relayer pays gas)
- EIP-712 domain separation

#### DAOVoting

- Inherits from `ERC2771Context`
- Receives original msg.sender from forwarder
- Proposal creation with balance requirements
- Multiple vote types (FOR/AGAINST/ABSTAIN)
- Automatic execution after security period

#### Frontend

- Connect MetaMask wallet
- Fund DAO with ETH
- Create proposals (UI validates 10% requirement)
- Cast gasless votes (client-side signing + relay)
- Real-time proposal status updates

#### Relayer API

- Receives signed meta-transactions
- Validates signatures on-chain
- Submits to MinimalForwarder
- Pays gas with relayer's account
- Returns transaction hash

#### Execution Daemon

- Runs every 30 seconds
- Checks all proposals
- Executes eligible proposals automatically
- Logs all actions

## 📊 Test Coverage

Current coverage:

| Area | Coverage | Tests |
|------|----------|-------|
| DAO Voting | ~85% | 15+ |
| MinimalForwarder | ~80% | 8+ |
| **Total** | **~83%** | **23+** |

Run tests:
```bash
cd sc
forge test -vv
forge coverage
```

## 🔐 Security Considerations

### Implemented Protections

1. **Replay Attack Prevention**
   - Per-user nonce tracking
   - EIP-712 domain separation
   - Nonce incremented on execution

2. **Signature Verification**
   - ECDSA signature verification
   - Signer must match msg.sender
   - Timestamp not required (simple nonce model)

3. **Access Control**
   - 10% balance requirement for proposal creation
   - Must have balance to vote
   - Deadline enforcement
   - Security period before execution

4. **State Validation**
   - Cannot vote twice
   - Cannot execute twice
   - Cannot execute before deadline + security period
   - Cannot vote after deadline

### Potential Future Improvements

- [ ] Time-locked proposals
- [ ] Multi-sig execution
- [ ] Vote delegation
- [ ] Withdrawal mechanism
- [ ] Quorum requirements
- [ ] Emergency pause function

## 🛠️ Configuration

### Environment Variables

**.env.local** (frontend & daemon):
```
NEXT_PUBLIC_DAO_ADDRESS=0x...           # DAOVoting contract
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...     # MinimalForwarder contract
NEXT_PUBLIC_CHAIN_ID=31337              # Local Anvil chain
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0x...               # For daemon & relay API
```

### Constants

**sc/src/DAOVoting.sol:**
- `MIN_CREATION_PERCENTAGE = 10` (percent)
- `SECURITY_PERIOD = 2 days`

**web/src/services/contracts.ts:**
- `FORWARDER_ABI` - Contract interface
- `DAO_ABI` - Contract interface
- `FORWARD_REQUEST_TYPE` - EIP-712 types

## 📚 Documentation

- [Smart Contracts README](./sc/README.md) - Contract details, deployment, testing
- [Frontend README](./web/README.md) - Frontend setup, components, API integration

## 🔗 Resources

- [EIP-2771 Specification](https://eips.ethereum.org/EIPS/eip-2771)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [Foundry Book](https://book.getfoundry.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ethers.js Documentation](https://docs.ethers.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🤝 Contributing

To contribute:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Checklist for Completion

- [x] MinimalForwarder contract implemented
- [x] DAOVoting contract implemented
- [x] Comprehensive tests for contracts
- [x] Deployment scripts
- [x] Next.js frontend setup
- [x] Web3 connection (MetaMask)
- [x] Fund DAO component
- [x] Create Proposal component
- [x] Voting components (with gasless support)
- [x] Relayer API route
- [x] Execution daemon
- [x] Environment configuration
- [x] Documentation (README files)
- [ ] Integration testing (manual)
- [ ] Video demonstration (optional)

## 📝 Notes

### Gas Costs (Approximate)

- Deploy MinimalForwarder: ~300K gas
- Deploy DAOVoting: ~1.2M gas
- Create Proposal: ~80K gas (paid by user, unless meta-tx)
- Vote: ~100K gas (via meta-tx, paid by relayer)
- Execute Proposal: ~50K gas (paid by daemon relayer)

### Testing Tips

1. Use Anvil's impersonation for testing without signatures
2. Use `vm.warp()` in Foundry to test time-based logic
3. Use `vm.deal()` to fund test accounts
4. Use `vm.prank()` to simulate different callers

### Debugging

Enable verbose logging:
```bash
# Contracts
forge test -vvv

# Frontend
NEXT_DEBUG=* npm run dev
```

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| MetaMask not connected | Ensure Anvil is running on correct port |
| Deployment fails | Check PRIVATE_KEY is set correctly |
| Relay fails | Verify relayer has enough ETH |
| Voting fails | Check nonce is synchronized |
| Balances not updating | Increase RPC polling interval |

## 📄 License

MIT License - feel free to use this project for educational and commercial purposes.

---

**Questions?** Check the individual README files or review the code comments for detailed explanations.
