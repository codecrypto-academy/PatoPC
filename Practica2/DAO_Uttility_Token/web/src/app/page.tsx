"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Web3Provider, useWeb3 } from "@/context/Web3Context";
import { ConnectWallet } from "@/components/ConnectWallet";
import { FundingPanel } from "@/components/FundingPanel";
import { CreateProposal } from "@/components/CreateProposal";
import { ProposalList } from "@/components/ProposalList";
import { DebugMetaTx } from "@/components/DebugMetaTx";
import { DAO_ABI } from "@/services/contracts";

const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";
const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

function DashboardContent() {
  const { wallet } = useWeb3();
  const [userDAOBalance, setUserDAOBalance] = useState("0");
  const [totalDAOBalance, setTotalDAOBalance] = useState("0");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Validate that required environment variables are configured
  const isConfigured = DAO_ADDRESS && FORWARDER_ADDRESS;

  const fetchBalances = async () => {
    if (!wallet.isConnected || !wallet.address || !isConfigured) return;

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);

      const userBalance = await contract.getUserBalance(wallet.address);
      const totalBalance = await contract.totalDAOBalance();

      setUserDAOBalance(ethers.formatEther(userBalance));
      setTotalDAOBalance(ethers.formatEther(totalBalance));
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 5000);
    return () => clearInterval(interval);
  }, [wallet.isConnected, wallet.address]);

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(fetchBalances, 1000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-indigo-600/20 p-2">
              <span className="text-xl">🏛️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">DAO Voting</h1>
              <p className="text-sm text-gray-300">Gasless governance made elegant</p>
            </div>
          </div>

          <ConnectWallet />
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="container">
        {!isConfigured ? (
          <div className="d-flex justify-content-center py-5">
            <div className="app-card mx-auto text-center" style={{maxWidth: 720}}>
              <h2 className="heading mb-2">⚙️ Configuration Required</h2>
              <p className="muted mb-4">Smart contract addresses are not configured.</p>
              <p className="text-danger">Please create a <code>.env.local</code> file in the <code>web</code> folder with:</p>
              <pre className="text-start bg-dark text-light p-3 rounded mt-3" style={{fontSize: '0.85rem', overflow: 'auto'}}>
{`NEXT_PUBLIC_DAO_ADDRESS=0x...
NEXT_PUBLIC_FORWARDER_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`}
              </pre>
              <p className="muted mt-3 mb-0">See <code>.env.local.example</code> for reference.</p>
            </div>
          </div>
        ) : !wallet.isConnected ? (
          <div className="d-flex justify-content-center py-5">
            <div className="app-card mx-auto text-center" style={{maxWidth: 720}}>
              <h2 className="heading mb-2">Welcome to DAO Voting</h2>
              <p className="muted mb-6">Connect your wallet to get started with gasless voting</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {/* Left Column */}
            <div className="col-12 col-lg-4 d-flex flex-column gap-4">
              <div className="app-card">
                <FundingPanel
                  daoAddress={DAO_ADDRESS}
                  userDAOBalance={userDAOBalance} // Saldo dentro del DAO
                  walletBalance={wallet.balance}  // <--- NUEVO: Saldo de MetaMask disponible para usar   // ...
                  totalDAOBalance={totalDAOBalance}
                  onSuccess={handleSuccess}
                />
              </div>

              <div className="app-card">
                <CreateProposal
                  daoAddress={DAO_ADDRESS}
                  userDAOBalance={userDAOBalance}
                  totalDAOBalance={totalDAOBalance}
                  onSuccess={handleSuccess}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="col-12 col-lg-8">
              <div className="app-card">
                <ProposalList
                  daoAddress={DAO_ADDRESS}
                  forwarderAddress={FORWARDER_ADDRESS}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          </div>
        )}
        </div>
 
      </main>

      {/* Footer */}
      <footer className="mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-400">
          <p>Gasless DAO Voting • Powered by EIP-2771 Meta-Transactions</p>
        </div>
      </footer>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Web3Provider>
      <DashboardContent />
    </Web3Provider>
  );
}
