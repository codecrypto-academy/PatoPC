// Archivo: dapp/components/DocumentSigner.tsx
"use client";
import { useState } from "react";
import { ethers } from "ethers"; // Solo para utilidades como getBytes
import { useWallet } from "../contexts/MetaMaskContext";
import { useContract } from "../hooks/useContract";
import FileUploader from "./FileUploader";
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

export default function DocumentSigner() {
  // Ahora importamos la función 'signMessage' directamente del hook
  const { selectedWallet, signMessage } = useWallet();
  const { getContract } = useContract();
  
  const [fileHash, setFileHash] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: string} | null>(null);

  const handleSign = async () => {
    if (!selectedWallet || !fileHash) return;

    try {
      const confirmSign = window.confirm(`¿Firmar hash con wallet ${selectedWallet.address}?`);
      if (!confirmSign) return;

      // SIMULACIÓN METAMASK:
      // Delegamos la firma al hook, pasando solo los bytes del hash.
      // Ya no manejamos claves privadas aquí.
      const sig = await signMessage(ethers.getBytes(fileHash));
      
      setSignature(sig);
    } catch (err) {
      console.error(err);
      setStatus({ msg: "Error al firmar el documento", type: "danger" });
    }
  };

  const handleStore = async () => {
    if (!signature || !selectedWallet) return;
    setLoading(true);
    setStatus({ msg: "Enviando transacción a Blockchain...", type: "info" });

    try {
      const contract = await getContract(true);
      if (!contract) throw new Error("No contract");

      const timestamp = Math.floor(Date.now() / 1000);
      
      // Enviamos la transacción
      const tx = await contract.storeDocumentHash(fileHash, timestamp, signature, selectedWallet.address);
      
      await tx.wait();
      
      setStatus({ msg: "✅ ¡Documento inmutado en Blockchain exitosamente!", type: "success" });
      setFileHash("");
      setSignature("");
    } catch (err: any) {
      console.error(err);
      setStatus({ msg: `Error: ${err.reason || err.message}`, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedWallet) return <Alert variant="warning">⚠️ Por favor conecta una wallet en la barra superior para continuar.</Alert>;

  return (
    <div className="mx-auto" style={{ maxWidth: '600px' }}>
      <h4 className="mb-4 text-secondary">1. Calcular Hash y Firmar</h4>
      <FileUploader onHashCalculated={setFileHash} />

      {fileHash && (
        <Alert variant="info" className="text-break font-monospace small">
          <strong>Hash SHA-256:</strong> {fileHash}
        </Alert>
      )}

      {fileHash && !signature && (
        <Button variant="primary" size="lg" className="w-100 shadow-sm" onClick={handleSign}>
          🔐 Firmar Digitalmente
        </Button>
      )}

      {signature && (
        <div className="mt-4 animate-fade-in">
          <Alert variant="success" className="text-break font-monospace small">
            <strong>Firma Generada:</strong> {signature}
          </Alert>
          <Button 
            variant="success" 
            size="lg" 
            className="w-100 shadow-sm" 
            onClick={handleStore}
            disabled={loading}
          >
            {loading ? <><Spinner as="span" animation="border" size="sm" /> Procesando...</> : "🚀 Almacenar en Blockchain"}
          </Button>
        </div>
      )}

      {status && (
        <Alert variant={status.type} className="mt-4">
          {status.msg}
        </Alert>
      )}
    </div>
  );
}