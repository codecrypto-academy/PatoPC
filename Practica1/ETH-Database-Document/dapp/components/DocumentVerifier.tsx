// Archivo: dapp/components/DocumentVerifier.tsx
"use client";
import { useState, useEffect } from "react";
import FileUploader from "./FileUploader";
import { useContract } from "../hooks/useContract";
import { useWallet } from "../contexts/MetaMaskContext"; // Importamos el contexto
import { CheckCircle, XCircle, Search } from "lucide-react";
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';

export default function DocumentVerifier() {
  const { getContract } = useContract();
  const { selectedWallet } = useWallet(); // Obtenemos la wallet seleccionada
  
  const [hash, setHash] = useState("");
  const [signerToCheck, setSignerToCheck] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(false);

  // EFECTO: Cuando cambia la wallet seleccionada, actualizamos el campo automáticamente
  useEffect(() => {
    if (selectedWallet) {
      setSignerToCheck(selectedWallet.address);
    }
  }, [selectedWallet]);

  const handleVerify = async () => {
    setLoading(true);
    setResult(null);
    try {
      const contract = await getContract(false);
      if (!contract) return;
      
      console.log("Verificando Hash:", hash);
      console.log("Contra Firmante:", signerToCheck);

      // 1. Obtener info guardada
      const info = await contract.getDocumentInfo(hash);
      console.log("Info en Blockchain:", info);

      // 2. Verificar
      const isValid = await contract.verifyDocument(hash, signerToCheck, info.signature);
      console.log("Resultado verificación:", isValid);
      
      setResult(isValid);

    } catch (err) {
      console.error("Error en verificación:", err);
      // Si falla es generalmente porque el documento no existe
      setResult(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: '600px' }}>
      <h4 className="mb-4 text-secondary">Verificador de Autenticidad</h4>
      
      <FileUploader onHashCalculated={setHash} />
      
      {hash && <p className="text-muted small text-break font-monospace">Hash: {hash}</p>}

      <Card className="bg-light border-0 mb-4">
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Dirección del Firmante Esperado</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="0x123..." 
              value={signerToCheck}
              onChange={(e) => setSignerToCheck(e.target.value)}
              className="font-monospace"
            />
            <Form.Text className="text-muted">
              Por defecto usamos tu wallet actual, pero puedes pegar otra dirección.
            </Form.Text>
          </Form.Group>
          <Button 
            variant="primary" 
            className="w-100" 
            onClick={handleVerify}
            disabled={!hash || !signerToCheck || loading}
          >
            {loading ? "Verificando..." : <><Search size={18} /> Verificar Ahora</>}
          </Button>
        </Card.Body>
      </Card>

      {result !== null && (
        <Alert variant={result ? "success" : "danger"} className="d-flex align-items-center gap-3 shadow-sm">
          {result ? <CheckCircle size={32} /> : <XCircle size={32} />}
          <div>
            <h5 className="alert-heading mb-1">{result ? "DOCUMENTO AUTÉNTICO" : "DOCUMENTO INVÁLIDO"}</h5>
            <p className="mb-0 small">
              {result 
                ? "La firma corresponde matemáticamente al archivo y al usuario indicado." 
                : "El archivo no existe en el historial, ha sido modificado, o el firmante es incorrecto."}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}