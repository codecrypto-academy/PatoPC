// Archivo: dapp/hooks/useContract.ts
import { ethers } from "ethers";
import { useWallet } from "../contexts/MetaMaskContext";

// ABI mínimo necesario para interactuar
const CONTRACT_ABI = [
  "function storeDocumentHash(bytes32 _hash, uint256 _timestamp, bytes memory _signature, address _signer) external",
  "function verifyDocument(bytes32 _hash, address _signer, bytes memory _signature) external view returns (bool)",
  "function getDocumentInfo(bytes32 _hash) external view returns (tuple(bytes32 hash, uint256 timestamp, bytes signature, address signer))",
  "function isDocumentStored(bytes32 _hash) external view returns (bool)",
  "function getDocumentCount() external view returns (uint256)",
  "function getDocumentHashByIndex(uint256 _index) external view returns (bytes32)"
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export function useContract() {
  const { provider, getEthersSigner } = useWallet();

  // Función para obtener una instancia conectada (lectura/escritura)
  const getContract = async (withSigner = false) => {
    if (!provider || !CONTRACT_ADDRESS) return null;

    if (withSigner) {
      // Pedimos el signer al "MetaMask simulado"
      const signer = await getEthersSigner();
      if (!signer) return null;
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    
    // Solo lectura (usa provider genérico)
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  return { getContract, CONTRACT_ADDRESS };
}