# DAO Voting Frontend (Next.js 15)

## Overview

This is a Next.js 15 frontend for interacting with the gasless DAO voting system using EIP-2771 meta-transactions.

## Features

- **Connect Wallet**: Connect MetaMask wallet
- **Fund DAO**: Deposit ETH into the DAO
- **Create Proposals**: Create proposals (requires ≥10% of DAO balance)
- **Gasless Voting**: Vote without paying gas through meta-transactions
- **Real-time Updates**: Live proposal status and vote counts
- **Vote Management**: Change votes before deadline

## Setup

### Prerequisites

- Node.js 18+ or newer
- MetaMask browser extension
- Local Anvil node running (or testnet RPC)

### Installation

```bash
cd web
npm install
```

### Configuration

1. Deploy smart contracts first (see `sc/README.md`)
2. Copy `.env.local.example` to `.env.local`
3. Fill in the contract addresses from deployment:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_DAO_ADDRESS=0x...      # from deployment
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...  # from deployment
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
RELAYER_PRIVATE_KEY=0x...           # relayer's private key
```

## Development

Start development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main dashboard page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── ConnectWallet.tsx    # Wallet connection button
│   ├── FundingPanel.tsx     # DAO funding interface
│   ├── CreateProposal.tsx   # Proposal creation form
│   ├── ProposalCard.tsx     # Individual proposal display
│   └── ProposalList.tsx     # Proposals list container
├── context/
│   └── Web3Context.tsx   # Web3 provider and hooks
├── hooks/
│   └── useWeb3.ts        # Web3 utilities
├── services/
│   ├── contracts.ts      # Contract ABIs and constants
│   └── meta-transactions.ts  # EIP-712 signing
├── types/
│   └── index.ts          # TypeScript interfaces
└── pages/
    └── api/
        └── relay.ts      # API route for relayer
```

## Key Components

### Web3Provider

Context provider managing wallet connection and provider state.

```tsx
<Web3Provider>
  <App />
</Web3Provider>
```

### Gasless Voting Flow

1. User clicks vote button
2. Frontend generates EIP-712 signature
3. Signature + request sent to relayer API
4. Relayer executes via MinimalForwarder (pays gas)
5. User's vote recorded on-chain

### API Route: `/api/relay`

Receives meta-transaction requests from frontend and executes them on-chain.

**Request Body:**
```json
{
  "request": {
    "from": "0x...",
    "to": "0x...",
    "value": "0",
    "gas": "100000",
    "nonce": 0,
    "data": "0x..."
  },
  "signature": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 123
}
```

## Building

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_DAO_ADDRESS` | DAO contract address | `0x5FbDB2315678afccb333f8de6f6ac7008ce3759a` |
| `NEXT_PUBLIC_FORWARDER_ADDRESS` | MinimalForwarder address | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `NEXT_PUBLIC_CHAIN_ID` | Blockchain chain ID | `31337` |
| `NEXT_PUBLIC_RPC_URL` | RPC endpoint URL | `http://127.0.0.1:8545` |
| `RELAYER_PRIVATE_KEY` | Private key of relayer account | `0x...` |

## Testing the Frontend

### Manual Testing Checklist

1. **Connection**
   - [ ] Can connect/disconnect wallet
   - [ ] Shows correct address and balance
   - [ ] Chain ID validation works

2. **Funding**
   - [ ] Can fund DAO with valid amount
   - [ ] User balance updates
   - [ ] Total DAO balance updates

3. **Proposals**
   - [ ] Can create proposal with ≥10% balance
   - [ ] Cannot create with <10% balance
   - [ ] Proposals show correct information
   - [ ] Deadline calculation correct

4. **Voting**
   - [ ] Can cast gasless vote
   - [ ] Vote count updates
   - [ ] User vote indicator shows
   - [ ] Cannot vote twice
   - [ ] Cannot vote after deadline

5. **Edge Cases**
   - [ ] MetaMask rejection handled
   - [ ] Network switch handled
   - [ ] Invalid addresses rejected
   - [ ] Error messages show correctly

## Troubleshooting

### MetaMask not detected
- Ensure MetaMask is installed
- Check browser console for errors
- Try refreshing page

### Transaction fails in relay
- Check relayer has enough ETH
- Verify contract addresses in `.env.local`
- Check RPC URL is accessible
- Review browser console for detailed error

### Balances not updating
- Check RPC URL is correct
- Verify contract addresses
- Allow time for blockchain to confirm

### Signature verification fails
- Ensure relayer is using correct chain ID
- Verify EIP-712 domain parameters
- Check nonce synchronization

## Performance Optimization

- Proposals and balances auto-refresh every 5-10 seconds
- Implement debouncing for frequent updates
- Use React.memo for proposal cards
- Lazy load components if needed

## Future Enhancements

- [ ] Vote delegation
- [ ] Proposal execution UI
- [ ] Vote history tracking
- [ ] Multiple chain support
- [ ] Token-weighted voting
- [ ] Proposal filtering/search
- [ ] Mobile responsiveness improvements
- [ ] Dark/light theme toggle
