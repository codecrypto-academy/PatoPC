# Architecture & Debugging Guide

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web3 Frontend                             │
│              (Next.js 15 + React 19 + ethers.js)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Wallet UI  │    │  Dashboard   │    │  Proposals   │       │
│  │  MetaMask    │───▶│  Components  │───▶│   Interface  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│          │                   │                    │               │
│          └───────────────────┴────────────────────┘               │
│                        │                                          │
│                  Web3Context                                      │
│           (Global Wallet State)                                  │
│                        │                                          │
└────────────────────────┼──────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌────────┐    ┌────────────┐    ┌────────────┐
    │  Fund  │    │   Create   │    │   Vote     │
    │  DAO   │    │ Proposal   │    │  (Gasless) │
    └────────┘    └────────────┘    └────────────┘
        │                │                │
        │ Regular        │ Regular        │ **EIP-712**
        │ Transaction    │ Transaction    │ **Signature**
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   Smart Contract Calls          │
        │   (DAOVoting.sol)               │
        └────────────────┬────────────────┘
                         │
                         ▼
┌─────────────────────────────────────┐
│  Voting Vote Signature              │
│  ┌──────────────────────────────┐   │
│  │  /api/relay                  │   │
│  │  (Relayer API Route)         │   │
│  └──────────────────────────────┘   │
│             │                        │
│             ▼                        │
│  ┌──────────────────────────────┐   │
│  │  MinimalForwarder            │   │
│  │  (EIP-2771 Forwarder)        │   │
│  │  - Verify Signature          │   │
│  │  - Check Nonce               │   │
│  │  - Execute Call              │   │
│  └──────────────────────────────┘   │
│             │                        │
│             ▼                        │
│  ┌──────────────────────────────┐   │
│  │  DAOVoting                   │   │
│  │  - Record Vote               │   │
│  │  - Update State              │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
             │
             ▼
      Blockchain State
      (Anvil / Testnet)
             │
             ▼
    ┌──────────────────────┐
    │  Execution Daemon    │
    │ (Node.js Background) │
    │ - Monitor Proposals  │
    │ - Auto-Execute       │
    │ - Logging            │
    └──────────────────────┘
```

## Component Hierarchy

```
App (page.tsx)
├── Web3Provider
│   └── DashboardContent
│       ├── Header
│       │   ├── Title
│       │   └── ConnectWallet
│       │       ├── Address Display
│       │       ├── Balance Display
│       │       └── Connect/Disconnect Buttons
│       │
│       └── Main Content (Grid)
│           ├── Left Column (lg:col-span-1)
│           │   ├── FundingPanel
│           │   │   ├── User Balance Display
│           │   │   ├── Total DAO Balance
│           │   │   ├── Amount Input
│           │   │   └── Fund Button
│           │   │
│           │   └── CreateProposal
│           │       ├── Validation Message
│           │       ├── Recipient Address Input
│           │       ├── Amount Input
│           │       ├── Deadline Days Input
│           │       └── Create Button
│           │
│           └── Right Column (lg:col-span-2)
│               └── ProposalList
│                   └── ProposalCard (for each proposal)
│                       ├── Proposal Header
│                       ├── Amount & Deadline
│                       ├── Vote Counts
│                       ├── Vote Buttons (FOR/AGAINST/ABSTAIN)
│                       └── Status Badge
```

## Data Flow Diagrams

### Funding Flow
```
User clicks "Fund DAO"
        │
        ▼
Validate input amount
        │
        ▼
Connect to DAOVoting contract
        │
        ▼
Call fundDAO() with ETH value
        │
        ▼
MetaMask confirms transaction
        │
        ▼
Wait for confirmation (1-2 blocks)
        │
        ▼
Success message
        │
        ▼
UI refreshes balances
        │
        ▼
ProposalList refreshes (10s interval)
```

### Gasless Voting Flow
```
User clicks "Vote For"
        │
        ▼
Fetch current nonce from MinimalForwarder
        │
        ▼
Prepare ForwardRequest:
  {
    from: userAddress,
    to: daoAddress,
    value: 0,
    gas: 100000,
    nonce: currentNonce,
    data: vote(proposalId, VoteType)
  }
        │
        ▼
Generate EIP-712 signature
  - Domain: { name, version, chainId, verifyingContract }
  - Types: ForwardRequest
  - Value: forwardRequest
        │
        ▼
Sign with user's private key via MetaMask
        │
        ▼
Send to /api/relay:
  POST /api/relay
  { request, signature }
        │
        ▼
Relayer validates:
  - Check request format
  - Verify environment variables
        │
        ▼
Relayer calls MinimalForwarder.execute()
  (Pays gas with relayer's account)
        │
        ▼
MinimalForwarder:
  - Verify signature matches request
  - Verify nonce == user's current nonce
  - Increment nonce
  - Call DAOVoting.vote() with msg.sender = userAddress
        │
        ▼
DAOVoting records vote:
  - Update votesFor/votesAgainst/votesAbstain
  - Mark user as voted
  - Emit VoteCast event
        │
        ▼
Return txHash to frontend
        │
        ▼
Show success message
        │
        ▼
UI refreshes (5-10s interval)
```

### Execution Flow
```
Daemon runs every 30 seconds:
        │
        ▼
Get current block timestamp
        │
        ▼
Fetch all proposals count
        │
        ▼
For each proposal:
        │
        ├─ Check: !executed?
        │ ├─ Check: deadline < now?
        │ ├─ Check: (now - deadline) >= 2 days?
        │ ├─ Check: votesFor > votesAgainst?
        │ │
        │ └─ If ALL checks pass:
        │     └─ Call executeProposal(id)
        │         ├─ Mark executed = true
        │         ├─ Transfer funds to recipient
        │         └─ Emit ProposalExecuted event
        │
        └─ Log result to daemon.log
```

## Debugging Guide

### 1. Contract Deployment Issues

**Problem: Deployment fails with "not recognized"**
```
Solution: Ensure Foundry is installed correctly
$ curl -L https://foundry.paradigm.xyz | bash
$ foundryup
```

**Problem: "Permission denied" or forge not found**
```
Solution: Add to PATH or use full path
# On macOS/Linux
export PATH="$PATH:$HOME/.foundry/bin"

# On Windows (PowerShell)
$env:Path += ";$env:APPDATA\.foundry\bin"
```

**Problem: "Insufficient balance" during deployment**
```
Solution: Check private key and Anvil balance
$ anvil  # Check first private key has 10,000 ETH
$ export PRIVATE_KEY=0xac0974bec39a... # Use correct key
```

### 2. Frontend Connection Issues

**Problem: MetaMask not detected**
```
Debug:
1. Check console: console.log(window.ethereum)
2. Reload extension: chrome://extensions
3. Check browser: Firefox/Chrome/Brave?
4. Ensure HTTPS or localhost (required for web3)
```

**Problem: Wrong network**
```
Debug:
1. Check MetaMask selected network
2. Verify RPC URL in network settings
3. Ensure Chain ID = 31337 for Anvil
4. Test RPC manually:
   curl -X POST http://127.0.0.1:8545 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Problem: Balance shows 0**
```
Debug:
1. Check wallet connected to correct account
2. Verify account imported from Anvil
3. Check RPC URL returns correct balance
4. Wait for balance update (5-10 seconds)
```

### 3. Transaction Issues

**Problem: Funding transaction fails**
```
Debug:
1. Check wallet has ETH balance
2. Verify DAO_ADDRESS in contract
3. Check amount > 0
4. Review MetaMask error message
5. Check console for error details
```

**Problem: Voting fails - "Already voted"**
```
Debug:
1. Check getUserVote returns true
2. Proposal might need refresh
3. Wait for blockchain confirmation
4. Check proposal ID is correct
```

**Problem: Relay returns "Relay failed"**
```
Debug:
1. Check /api/relay is running
2. Verify .env.local has RELAYER_PRIVATE_KEY
3. Check relayer has enough ETH (0.1+ ETH)
4. Review network request in DevTools:
   - Network tab > api/relay
   - Check request body
   - Check response body
   - Check status code (should be 200)
```

### 4. Daemon Issues

**Problem: Daemon not executing proposals**
```
Debug:
1. Check daemon is running:
   ps aux | grep daemon
2. Check daemon.log for errors:
   tail -f daemon.log
3. Verify proposal eligibility:
   - deadline has passed
   - (now - deadline) >= 2 days
   - votesFor > votesAgainst
4. Check relayer has enough ETH
5. Verify DAO_ADDRESS in .env
```

**Problem: Daemon crashes**
```
Debug:
1. Check Node.js version (18+):
   node --version
2. Check ts-node is installed:
   npx ts-node --version
3. Try running with more verbose output:
   DEBUG=* npx ts-node daemon.ts
4. Check daemon.log for detailed error
```

### 5. Test Failures

**Problem: Forge tests fail**
```
Debug:
1. Check Solidity version:
   forge --version
2. Build contracts:
   forge build
3. Run specific test:
   forge test --match-path test/DAOVoting.t.sol -vvv
4. Check imports and remappings
```

**Problem: Specific test hangs**
```
Debug:
1. Check for infinite loops
2. Add console.log (console.log in Solidity)
3. Increase timeout:
   forge test --timeout 60000
4. Run with gas tracing:
   forge test -vvv --gas-report
```

## Logging & Monitoring

### Frontend Debugging

Enable verbose logging:
```javascript
// Add to App component
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    window.debugMode = true;
  }
}, []);

// In services
if (window.debugMode) {
  console.log('Debug info:', { /* data */ });
}
```

View in DevTools:
```
1. Open DevTools (F12)
2. Console tab
3. Filter by component name
4. Look for "Debug info:" logs
```

### Backend Debugging

Monitor daemon:
```bash
# Watch log file
tail -f daemon.log

# Filter for errors
grep ERROR daemon.log

# Count executions
grep "Executing proposal" daemon.log | wc -l
```

Monitor relay API:
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check specific route
curl -X POST http://localhost:3000/api/relay \
  -H "Content-Type: application/json" \
  -d @request.json
```

### On-Chain Debugging

Check contract state:
```bash
# Read proposal
cast call 0xDAOAddress \
  "getProposal(uint256)" 1 \
  --rpc-url http://127.0.0.1:8545

# Read user balance
cast call 0xDAOAddress \
  "getUserBalance(address)" 0xUserAddress \
  --rpc-url http://127.0.0.1:8545

# Get proposal count
cast call 0xDAOAddress \
  "getProposalCount()" \
  --rpc-url http://127.0.0.1:8545
```

## Performance Optimization Tips

1. **Reduce polling frequency**: Change from 5s to 10-30s
2. **Implement caching**: Cache proposal state locally
3. **Batch requests**: Fetch multiple proposals in single call
4. **Use Web3 hooks efficiently**: Memoize expensive computations
5. **Optimize daemon**: Use indexing for proposal queries

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "MetaMask not detected" | Extension not installed | Install MetaMask |
| "Invalid sender" | Wrong address format | Ensure checksummed address |
| "Insufficient balance" | Not enough ETH/tokens | Fund account or add funds |
| "Already voted" | User voted twice | Clear state or refresh |
| "Voting period has ended" | Past deadline | Check deadline time |
| "Relay failed" | Relayer issue | Check environment vars |
| "Signature verification failed" | Wrong signer | Ensure correct account |

---

**Last Updated**: December 2024
