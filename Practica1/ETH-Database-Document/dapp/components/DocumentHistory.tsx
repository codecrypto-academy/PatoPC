// Archivo: dapp/components/DocumentHistory.tsx
"use client";
import { useEffect, useState } from "react";
import { useContract } from "../hooks/useContract";
import { useTheme } from "../contexts/ThemeContext"; // Importamos el tema
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { Download, RefreshCw } from "lucide-react";

type DocInfo = {
  hash: string;
  timestamp: number;
  signer: string;
  signature: string;
};

export default function DocumentHistory() {
  const { getContract } = useContract();
  const { theme } = useTheme(); // Obtenemos el tema actual
  const [documents, setDocuments] = useState<DocInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const contract = await getContract(false);
      if (!contract) return;

      const count = await contract.getDocumentCount();
      const docs: DocInfo[] = [];

      for (let i = Number(count) - 1; i >= 0; i--) {
        const hash = await contract.getDocumentHashByIndex(i);
        const info = await contract.getDocumentInfo(hash);
        docs.push({
          hash: info.hash,
          timestamp: Number(info.timestamp),
          signer: info.signer,
          signature: info.signature
        });
      }
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExportCSV = () => {
    if (documents.length === 0) return;
    const headers = ["Hash Documento", "Firmante", "Fecha (ISO)", "Firma Digital"];
    const rows = documents.map(doc => [
      doc.hash,
      doc.signer,
      new Date(doc.timestamp * 1000).toISOString(),
      doc.signature
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historial_blockchain_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-secondary mb-0">Registro Inmutable</h4>
        <div className="d-flex gap-2">
            <Button 
                variant="outline-success" 
                size="sm" 
                onClick={handleExportCSV}
                disabled={loading || documents.length === 0}
                className="d-flex align-items-center gap-2"
            >
                <Download size={16} /> Exportar CSV
            </Button>

            <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={fetchHistory} 
                disabled={loading}
                className="d-flex align-items-center gap-2"
            >
                {loading ? <Spinner as="span" animation="border" size="sm" /> : <RefreshCw size={16} />} 
                Refrescar
            </Button>
        </div>
      </div>

      {!loading && documents.length === 0 && (
        <div className={`text-center py-5 rounded ${theme === 'dark' ? 'bg-secondary text-white-50' : 'bg-light text-muted'}`}>
          No hay documentos registrados en la blockchain todavía.
        </div>
      )}

      {documents.length > 0 && (
        <div className="table-responsive">
            <Table 
                striped 
                bordered 
                hover 
                // Aplicamos el variante dark a la tabla si el tema es oscuro
                variant={theme === 'dark' ? 'dark' : undefined}
                className="align-middle shadow-sm"
            >
            <thead className={theme === 'dark' ? 'table-light' : 'table-dark'}>
                <tr>
                <th>Hash del Documento</th>
                <th>Firmante</th>
                <th>Fecha de Registro</th>
                <th>Firma Digital</th>
                </tr>
            </thead>
            <tbody>
                {documents.map((doc) => (
                <tr key={doc.hash}>
                    <td className="font-monospace small text-primary" title={doc.hash}>
                        {doc.hash.slice(0, 14)}...
                    </td>
                    <td className="font-monospace small">
                        <Badge bg="secondary" className="fw-normal">
                            {doc.signer.slice(0, 10)}...
                        </Badge>
                    </td>
                    <td className="small">{new Date(doc.timestamp * 1000).toLocaleString()}</td>
                    <td className="font-monospace text-muted small" title={doc.signature}>
                        {doc.signature.slice(0, 10)}...
                    </td>
                </tr>
                ))}
            </tbody>
            </Table>
        </div>
      )}
    </div>
  );
}