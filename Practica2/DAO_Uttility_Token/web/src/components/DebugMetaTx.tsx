"use client";

import React, { useState, useEffect } from "react";

// ==========================================
// ⚠️ INSTRUCCIONES PARA TU PROYECTO LOCAL ⚠️
// ==========================================
// 1. ELIMINA toda la sección de "MOCKS" de abajo.
// 2. DESCOMENTA las importaciones reales de abajo.

// --- MOCKS PARA VISTA PREVIA (BORRAR ESTO EN TU PROYECTO) ---
/*const ethers: any = {
  JsonRpcProvider: class {},
  Contract: class { eip712Domain() { return Promise.resolve({}); } },
  Interface: class {}
};
const useWeb3 = () => ({ 
  wallet: { isConnected: false }, 
  accounts: [] 
});*/
// -----------------------------------------------------------

// --- IMPORTACIONES REALES (DESCOMENTAR EN TU PROYECTO) ---
 import { ethers } from "ethers";
 import { useWeb3 } from "@/context/Web3Context";
// ---------------------------------------------------------

const FORWARDER_DEBUG_ABI = [
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
];

export function DebugMetaTx({ forwarderAddress }: { forwarderAddress: string }) {
  const { wallet } = useWeb3();
  const [domainData, setDomainData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkDomain = async () => {
      // Verificación de seguridad para evitar errores si no hay wallet
      if (!wallet?.isConnected || !forwarderAddress) return;
      
      try {
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const contract = new ethers.Contract(forwarderAddress, FORWARDER_DEBUG_ABI, provider);
        
        // Intentar leer el dominio EIP-712 del contrato
        const result = await contract.eip712Domain();
        
        setDomainData({
          name: result.name,
          version: result.version,
          chainId: result.chainId.toString(),
          verifyingContract: result.verifyingContract,
        });
      } catch (err) {
        console.error("Debug Error:", err);
        setError("Could not read EIP712 Domain. Is the contract address correct?");
      }
    };

    checkDomain();
  }, [forwarderAddress, wallet?.isConnected]);

  if (!domainData) return null;

  return (
    <div className="bg-slate-800 text-white p-4 rounded-lg my-4 font-mono text-xs">
      <h3 className="text-yellow-400 font-bold mb-2">🔍 DEBUG: Contract Expected Domain</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>Expected Name:</div>
        <div className="text-green-400">{domainData.name}</div>
        
        <div>Expected Version:</div>
        <div className="text-green-400">{domainData.version}</div>
        
        <div>Chain ID:</div>
        <div className="text-green-400">{domainData.chainId}</div>
        
        <div>Contract Address:</div>
        <div className="text-green-400">{domainData.verifyingContract}</div>
      </div>
      
      {domainData.version !== "0.0.1" && (
        <div className="mt-2 text-red-400 font-bold bg-red-900/50 p-2 rounded">
          ⚠️ ALERT: Your code uses "0.0.1" but contract expects "{domainData.version}"!
          Update contracts.ts immediately.
        </div>
      )}
    </div>
  );
}