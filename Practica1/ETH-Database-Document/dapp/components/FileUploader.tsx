// Archivo: dapp/components/FileUploader.tsx
"use client";
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { Upload, FileText, ArrowDownCircle } from "lucide-react";
// CORRECCIÓN: Usamos la importación con llaves desde el paquete raíz
import { Form } from 'react-bootstrap';

interface Props {
  onHashCalculated: (hash: string) => void;
}

export default function FileUploader({ onHashCalculated }: Props) {
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Lógica centralizada para procesar el archivo (sea por click o por drop)
  const processFile = async (file: File) => {
    if (!file) return;

    setFileName(file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const hash = ethers.keccak256(buffer);
      onHashCalculated(hash);
    } catch (error) {
      console.error("Error procesando archivo:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // --- Manejadores de eventos Drag & Drop ---

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div 
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`text-center p-5 border rounded mb-3 position-relative transition-all`}
      style={{ 
        borderStyle: 'dashed', 
        borderWidth: '2px',
        // Cambiamos colores dinámicamente según el estado
        backgroundColor: isDragging ? '#e8f5e9' : '#f8f9fa', // Verde claro al arrastrar vs gris claro
        borderColor: isDragging ? '#198754' : '#0d6efd',     // Verde vs Azul
        cursor: isDragging ? 'copy' : 'default',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <div className={`mb-3 ${isDragging ? 'text-success' : 'text-primary'}`}>
        {/* Cambiamos el ícono para dar feedback visual */}
        {isDragging ? <ArrowDownCircle size={48} /> : <Upload size={48} />}
      </div>
      
      <h5 className="mb-3 user-select-none">
        {isDragging ? "¡Suelta el archivo aquí!" : "Arrastra y suelta tu documento aquí"}
      </h5>
      
      <div className="d-flex justify-content-center position-relative" style={{ zIndex: 2 }}>
        <Form.Group controlId="formFile" className="mb-0">
            <Form.Label className={`btn btn-lg m-0 shadow-sm ${isDragging ? 'btn-success' : 'btn-primary'}`}>
                {isDragging ? "Soltar Ahora" : "Seleccionar Archivo"}
                <Form.Control 
                  type="file" 
                  hidden 
                  onChange={handleFileChange} 
                  onClick={(e) => (e.currentTarget.value = '')} // Permite re-seleccionar el mismo archivo si es necesario
                />
            </Form.Label>
        </Form.Group>
      </div>
      
      {fileName && (
        <div className="mt-3 text-success fw-bold d-flex align-items-center justify-content-center gap-2">
            <FileText size={20} />
            <span>{fileName}</span>
        </div>
      )}
      
      <div className="text-muted small mt-3 user-select-none">
        El archivo se procesa localmente en tu navegador.
      </div>
    </div>
  );
}