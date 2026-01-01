# Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Foundry installed (`forge --version`)
- [ ] MetaMask extension installed
- [ ] Anvil running (or access to testnet RPC)

## Step 1: Deploy Smart Contracts (10 minutes)

```bash
# Navigate to smart contracts directory
cd sc

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts

# Verify installation
forge build

# Run tests to verify everything works
forge test -v
```

**Expected Output:**
```
Running 15 tests for test/DAOVoting.t.sol
[PASS] ...
[PASS] ...
Test result: ok. 15 passed
```

## Step 2: Start Local Blockchain (5 minutes)

```bash
# In terminal 1
anvil

# Look for this output:
# Listening on 127.0.0.1:8545
# Private Keys:
# (0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1f02960247590a4a3
# ...
```

**Keep this terminal running!**

## Step 3: Deploy Contracts to Local Network (5 minutes)

```bash
# In terminal 2, from sc directory
cd sc

# Export the first private key from Anvil
export PRIVATE_KEY=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Deploy contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# You should see:
# MinimalForwarder deployed at: 0x5FbDB2315678afccb333f8de6f6ac7008ce3759a
# DAOVoting deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Save these addresses!
```

## Step 4: Configure Frontend (5 minutes)

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install
#(Desde la consola del anvil)
#NEXT_PUBLIC_DAO_ADDRESS <--- Va la dirección de DAOVoting (0xe7f...)
#NEXT_PUBLIC_FORWARDER_ADDRESS <--- Va la dirección de MinimalForwarder (0x5Fb...)
#RELAYER_PRIVATE_KEY es la KEY que se exporto antes

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_DAO_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_FORWARDER_ADDRESS=0x5FbDB2315678afccb333f8de6f6ac7008ce3759a
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6c1f02960247590a4a3
EOF

# Replace the addresses with your deployed addresses!
```

## Step 5: Start Frontend (5 minutes)

```bash
# In terminal 3, from web directory
cd web

# Start development server
npm run dev

# Visit http://localhost:3000
```

## Step 6: Start Execution Daemon (2 minutes)

```bash
# In terminal 4, from web directory
cd web

# First, install ts-node if not already installed
npm install -g ts-node

# Start daemon
npx ts-node daemon.ts

# You should see:
# DAO Execution Daemon started
# Configuration:
#   DAO Address: 0x...
#   RPC URL: http://127.0.0.1:8545
```

## Step 7: Configure MetaMask

1. Open MetaMask extension
2. Click network selector (top-right)
3. Add custom network:
   - **Network Name**: Anvil Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
4. Switch to Anvil Local network
5. Import account from Anvil private key:
   - Click account icon → Import Account
   - Enter a private key from Anvil output
   - You now have 10,000 ETH on this account!

## Step 8: Test the Application

### 8a. Connect Wallet
- [ ] Open http://localhost:3000
- [ ] Click "Connect Wallet"
- [ ] Approve in MetaMask
- [ ] Should see your address and 10,000 ETH

### 8b. Fund DAO
- [ ] Enter "10" ETH in Fund DAO panel
- [ ] Click "Fund DAO"
- [ ] Approve in MetaMask
- [ ] Wait for confirmation
- [ ] Should see balance updated

### 8c. Create Proposal
- [ ] You should have >10% balance now
- [ ] Enter a recipient address (from Anvil accounts)
- [ ] Enter "2" ETH
- [ ] Enter "1" day deadline
- [ ] Click "Create Proposal"
- [ ] Approve in MetaMask
- [ ] Proposal should appear in list

### 8d. Vote (Gasless!)
- [ ] Click "Vote For" on the proposal
- [ ] **No MetaMask popup!** (gasless voting)
- [ ] Vote should appear immediately
- [ ] Vote count should update

### 8e. Test Execution
- [ ] Wait 1 day + 2 days (or use Anvil's `anvil_mine` in another terminal)
- [ ] Daemon should automatically execute
- [ ] Proposal state should change to EXECUTED
- [ ] Recipient should have received funds

## Troubleshooting

### MetaMask won't connect
```bash
# Check Anvil is running
# Make sure you added custom network with correct RPC URL
# Try refreshing the page
```

### Deployment fails
```bash
# Check PRIVATE_KEY is exported
echo $PRIVATE_KEY

# Should see: 0xac0974bec39a...
```

### Voting fails "Relay failed"
```bash
# Check relayer has enough ETH
# Check DAO_ADDRESS and FORWARDER_ADDRESS in .env.local are correct
# Check RPC_URL is accessible
```

### Daemon not executing proposals
```bash
# Check daemon terminal shows no errors
# Verify proposal should be executed:
#   - deadline passed
#   - security period passed (2 days)
#   - votesFor > votesAgainst
```

## Next Steps

1. **Experiment with multiple accounts**
   - Import more Anvil accounts
   - Test quorum requirements
   - Test balance-based voting power

2. **Review the code**
   - Check smart contract logic in `sc/src/`
   - Review frontend components in `web/src/components/`
   - Study EIP-2771 implementation

3. **Make modifications**
   - Change voting periods
   - Add new voting types
   - Implement delegation
   - Add proposal categories

4. **Deploy to testnet**
   - Get testnet ETH (Sepolia faucet)
   - Update `.env.local` with testnet RPC
   - Redeploy contracts
   - Test with real gas prices

## File Timestamps

- Smart Contracts: Version 1.0
- Frontend: Version 1.0
- Daemon: Version 1.0

Total setup time: ~30 minutes

Enjoy your gasless DAO! 🚀
