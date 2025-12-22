// Archivo: dapp/app/page.tsx
"use client";
import { useState } from "react";
import { useWallet } from "../contexts/MetaMaskContext";
import { useTheme } from "../contexts/ThemeContext"; // Importamos el hook de tema
import DocumentSigner from "../components/DocumentSigner";
import DocumentVerifier from "../components/DocumentVerifier";
import DocumentHistory from "../components/DocumentHistory";

// Componentes de React Bootstrap
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { ShieldCheck, PenTool, Search, Database, Sun, Moon } from "lucide-react";

export default function Home() {
  const { wallets, selectWallet, selectedWallet, isConnected } = useWallet();
  const { theme, toggleTheme } = useTheme(); // Usamos el tema
  const [key, setKey] = useState('upload');

  const selectValue = selectedWallet ? selectedWallet.index.toString() : "";

  return (
    // Cambiamos bg-light por bg-body-tertiary para que cambie automáticamente en dark mode
    <div className="bg-body-tertiary min-vh-100 pb-5 font-sans transition-colors">
      {/* Navbar Superior */}
      <Navbar bg={theme === 'dark' ? 'dark' : 'dark'} data-bs-theme="dark" expand="lg" className="mb-4 shadow-sm sticky-top">
        <Container>
          <Navbar.Brand href="#home" className="fw-bold d-flex align-items-center gap-2">
            <ShieldCheck size={24} className="text-warning" />
            <span>ETH Notary</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
            <Nav className="align-items-center gap-3 mt-3 mt-lg-0">
              
              {/* Toggle de Tema */}
              <Button 
                variant={theme === 'dark' ? 'outline-light' : 'outline-secondary'} 
                size="sm" 
                onClick={toggleTheme}
                className="d-flex align-items-center gap-2 border-0"
                title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} className="text-light" />}
              </Button>

              <div className="d-flex flex-column text-lg-end text-light">
                <span className="small text-white-50 mb-1">Wallet Activa</span>
                <Form.Select 
                  size="sm" 
                  style={{ width: '220px', cursor: 'pointer' }}
                  onChange={(e) => selectWallet(Number(e.target.value))}
                  value={selectValue}
                  className="bg-secondary text-white border-secondary shadow-sm"
                >
                  <option value="" disabled>Seleccionar Wallet</option>
                  {wallets.map((w) => (
                    <option key={w.index} value={w.index}>
                      Wallet {w.index} ({w.address.slice(0,6)}...{w.address.slice(-4)})
                    </option>
                  ))}
                </Form.Select>
              </div>
              {isConnected ? (
                <Badge bg="success" className="p-2 d-flex align-items-center gap-1 shadow-sm">
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                  Conectado
                </Badge>
              ) : (
                <Badge bg="warning" text="dark" className="p-2 shadow-sm">
                  ⚠️ Desconectado
                </Badge>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <Container className="mb-5">
        <div className="text-center py-4">
            <h1 className="display-5 fw-bold mb-3">Registro de Documentos en Blockchain</h1>
            <p className="lead text-secondary mx-auto mb-4" style={{ maxWidth: '800px' }}>
                Certifica la existencia e integridad de tus archivos utilizando la seguridad de la red Ethereum.
            </p>
            
            <Row className="justify-content-center g-4 text-start mt-2">
                <Col md={4} lg={3}>
                    {/* Tarjetas informativas con soporte de tema */}
                    <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="d-flex gap-3 align-items-start">
                            <div className="text-primary"><PenTool size={32} /></div>
                            <div>
                                <h6 className="fw-bold mb-1">1. Firmar</h6>
                                <p className="small text-muted mb-0">Sube y firma criptográficamente con tu billetera.</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} lg={3}>
                    <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="d-flex gap-3 align-items-start">
                            <div className="text-success"><Database size={32} /></div>
                            <div>
                                <h6 className="fw-bold mb-1">2. Almacenar</h6>
                                <p className="small text-muted mb-0">Guarda la "huella digital" de forma inmutable.</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} lg={3}>
                    <Card className="h-100 border-0 shadow-sm">
                        <Card.Body className="d-flex gap-3 align-items-start">
                            <div className="text-purple-600" style={{color: '#6f42c1'}}><Search size={32} /></div>
                            <div>
                                <h6 className="fw-bold mb-1">3. Verificar</h6>
                                <p className="small text-muted mb-0">Comprueba autenticidad y autoría públicamente.</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
      </Container>

      {/* Contenido Principal */}
      <Container>
        <Card className="main-card shadow-lg border-0 rounded-3">
          <Card.Header className="pt-3 px-3 border-bottom">
            <Tabs
              id="app-tabs"
              activeKey={key}
              onSelect={(k) => setKey(k || 'upload')}
              className="mb-0 border-bottom-0"
              fill
              justify
            >
              <Tab 
                eventKey="upload" 
                title={<span className="fw-bold d-flex align-items-center justify-content-center gap-2"><PenTool size={18}/> Firmar Documento</span>} 
              />
              <Tab 
                eventKey="verify" 
                title={<span className="fw-bold d-flex align-items-center justify-content-center gap-2"><Search size={18}/> Verificar Autenticidad</span>}
              />
              <Tab 
                eventKey="history" 
                title={<span className="fw-bold d-flex align-items-center justify-content-center gap-2"><Database size={18}/> Historial</span>}
              />
            </Tabs>
          </Card.Header>
          
          <Card.Body className="p-4 p-lg-5 rounded-bottom-3">
            {key === 'upload' && <div className="animate-fade-in"><DocumentSigner /></div>}
            {key === 'verify' && <div className="animate-fade-in"><DocumentVerifier /></div>}
            {key === 'history' && <div className="animate-fade-in"><DocumentHistory /></div>}
          </Card.Body>
        </Card>
      </Container>
      
      <footer className="text-center text-muted mt-5 mb-4 small">
        <p>© 2025 ETH Notary dApp - Ejecutando en Red Local (Anvil)</p>
      </footer>
    </div>
  );
}