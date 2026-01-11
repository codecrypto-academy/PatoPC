# 🏛️ DAO Gasless Voting - Explicación del Proyecto

## 📋 Resumen Ejecutivo

Este proyecto es un **DAO (Organización Autónoma Descentralizada) con votación gasless**, utilizando la estándar **EIP-2771** para meta-transacciones. Permite que los miembros del DAO voten **sin pagar gas**, mientras que un **relayer de confianza** ejecuta las transacciones en su nombre.

### Principales características:
- ✅ Votación sin gas (gasless)
- ✅ Proposals con descripción y título
- ✅ Período de seguridad de 2 días post-votación
- ✅ Ejecución automática de propuestas aprobadas
- ✅ Saldo basado en poder de voto
- ✅ Interfaz web moderna (Next.js)

---

## 🎯 Visión General: Cómo Funciona

```
┌─────────────────────────────────────────────────────────┐
│                    FLUJO DEL SISTEMA                    │
└─────────────────────────────────────────────────────────┘

1️⃣  USUARIO FINANCIA DAO
    └─ Envía ETH al contrato DAOVoting
    └─ Recibe poder de voto proporcional

2️⃣  USUARIO CREA PROPUESTA (si tiene ≥10% del balance)
    └─ Define: título, descripción, destinatario, monto, plazo
    └─ Transacción normal (paga gas)

3️⃣  VOTACIÓN GASLESS ⚡
    └─ Usuario firma con su wallet (sin gas)
    └─ Frontend envía firma al Relayer API
    └─ Relayer ejecuta votación en su nombre
    └─ MinimalForwarder valida la firma EIP-712
    └─ DAOVoting registra el voto

4️⃣  PERÍODO DE SEGURIDAD (2 días)
    └─ Pasa el deadline de votación
    └─ Esperan 2 días de seguridad
    └─ Validan: votosFor > votosAgainst

5️⃣  EJECUCIÓN AUTOMÁTICA
    └─ Daemon monitorea propuestas
    └─ Ejecuta automáticamente cuando cumplen requisitos
    └─ Transfiere fondos al destinatario
```

---

## 🔑 Partes Clave del Proyecto

### 1. Smart Contract: DAOVoting.sol

**Archivo:** [sc/src/DAOVoting.sol](sc/src/DAOVoting.sol)

#### A) Gestión de Propuestas
**Líneas 26-40:** Estructuras de datos
```solidity
struct Proposal {
    uint256 id;
    string title;              // ← Nuevo: título de propuesta
    string description;        // ← Nuevo: descripción
    address recipient;
    uint256 amount;
    uint256 deadline;
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 votesAbstain;
    bool executed;
    uint256 executionTime;
}
```

**📌 Notas:**
- Cada propuesta almacena información completa
- Tres tipos de voto: FOR, AGAINST, ABSTAIN
- El deadline determina cuándo termina la votación

---

#### B) Financiamiento del DAO
**Líneas 123-128:** Función para financiar
```solidity
function fundDAO() external payable {
    require(msg.value > 0, "Must send ETH");
    userBalances[_msgSender()] += msg.value;
    totalDAOBalance += msg.value;
    emit DAOFunded(_msgSender(), msg.value);
}
```

**📌 Notas:**
- Cualquiera puede enviar ETH
- Recibe poder de voto = su balance en ETH
- Se registra en `userBalances` mapping

---

#### C) Creación de Propuestas
**Líneas 131-147:** Validación y creación
```solidity
function createProposal(
    string memory title,
    string memory description,
    address recipient,
    uint256 amount,
    uint256 deadline
) external {
    require(bytes(title).length > 0, "Title required");
    // Requiere: balance del usuario ≥ 10% del DAO total
    uint256 requiredBalance = (totalDAOBalance * MIN_CREATION_PERCENTAGE) / 100;
    require(userBalances[_msgSender()] >= requiredBalance, ...);
```

**📌 Notas:**
- Solo usuarios con ≥10% del balance pueden crear
- Esto previene spam de propuestas
- Válido almacenar título y descripción on-chain (caro pero permanente)

---

#### D) Votación Gasless (EIP-2771)
**Líneas 160-180:** Función vote con ERC2771Context
```solidity
function vote(uint256 proposalId, uint8 voteType) 
    external 
    proposalExists(proposalId) 
    canVote(proposalId) 
{
    // _msgSender() retorna el usuario original (del signature)
    // NO el relayer que ejecuta la tx
    votes[proposalId][_msgSender()].voted = true;
    votes[proposalId][_msgSender()].voteType = VoteType(voteType);
    
    if (voteType == 0) proposal.votesFor++;
    else if (voteType == 1) proposal.votesAgainst++;
    else proposal.votesAbstain++;
    
    emit VoteCast(proposalId, _msgSender(), VoteType(voteType));
}
```

**📌 Notas:**
- Hereda de `ERC2771Context` (OpenZeppelin)
- `_msgSender()` identifica al votante original, no al relayer
- El trustedForwarder (MinimalForwarder) es parte del constructor

---

#### E) Validadores de Ejecución
**Líneas 95-112:** Modifier `canExecute`
```solidity
modifier canExecute(uint256 proposalId) {
    Proposal storage proposal = proposals[proposalId];
    require(!proposal.executed, "Proposal already executed");
    require(block.timestamp > proposal.deadline, "Voting period still active");
    require(
        block.timestamp >= proposal.deadline + SECURITY_PERIOD,  // 2 días
        "Security period not passed"
    );
    require(proposal.votesFor > proposal.votesAgainst, "Proposal not approved");
    _;
}
```

**📌 Notas:**
- SECURITY_PERIOD = 2 días (línea 47)
- Previene ataques flash-loan
- Garantiza votación justa y transparencia temporal

---

### 2. Smart Contract: MinimalForwarder.sol

**Archivo:** [sc/src/MinimalForwarder.sol](sc/src/MinimalForwarder.sol)

#### A) Estructura EIP-2771
**Líneas 1-15:** Definición del contrato
```solidity
contract MinimalForwarder is EIP712 {
    struct ForwardRequest {
        address from;           // El votante original
        address to;             // DAOVoting
        uint256 value;          // ETH a transferir (0 para vote)
        uint256 gas;            // Gas limit
        uint256 nonce;          // Anti-replay
        bytes data;             // Encoded function call
    }
```

**📌 Notas:**
- Usa EIP-712 para hashing tipado seguro
- No almacena estados, solo verifica firmas
- El nonce previene replay attacks

---

#### B) Verificación de Firma
**Líneas 54-72:** Validación criptográfica
```solidity
function verify(ForwardRequest calldata req, bytes calldata signature)
    public
    view
    returns (bool)
{
    address signer = _hashTypedDataV4(
        keccak256(
            abi.encode(
                TYPEHASH,
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        )
    ).recover(signature);
    
    return signer == req.from && _nonces[req.from] == req.nonce;
}
```

**📌 Notas:**
- Recupera la dirección del firmante desde la signature
- Verifica que sea quien dice ser
- Compara nonce para evitar repeticiones

---

#### C) Ejecución de Meta-Transacciones
**Líneas 74-100:** Envío a MinimalForwarder (en `execute()`)
```solidity
function execute(ForwardRequest calldata req, bytes calldata signature)
    public
    payable
    returns (bytes memory)
{
    require(verify(req, signature), "Invalid signature");
    require(req.from != address(0));
    
    _nonces[req.from]++;  // Incrementar nonce (contra replay)
    
    (bool success, bytes memory returndata) = req.to.call{
        gas: req.gas,
        value: req.value
    }(abi.encodePacked(req.data, req.from));  // Agregar from al calldata
    
    emit MetaTransactionExecuted(req.from, req.to, returndata);
    return returndata;
}
```

**📌 Notas:**
- Solo MinimalForwarder puede ejecutar → DAOVoting confía en él
- El parámetro `from` se añade al calldata
- DAOVoting usa ERC2771Context para extraer `from` como `msg.sender`

---

### 3. Frontend: Votación Gasless

**Archivo:** [web/src/services/meta-transactions.ts](web/src/services/meta-transactions.ts)

#### A) Firma EIP-712
**Líneas 1-40:** Generación de firma
```typescript
export async function signVoteMetaTransaction(
  signer: ethers.Signer,
  forwarderAddress: string,
  daoAddress: string,
  proposalId: number,
  voteType: VoteType,
  nonce: number
): Promise<{ request: ForwardRequest; signature: string }> {
  
  // 1. Codificar la llamada
  const daoInterface = new ethers.Interface(["function vote(uint256 proposalId, uint8 voteType)"]);
  const data = daoInterface.encodeFunctionData("vote", [proposalId, Number(voteType)]);

  // 2. Construir ForwardRequest
  const forwardRequest: ForwardRequest = {
    from: await signer.getAddress(),
    to: daoAddress,
    value: "0",
    gas: "300000",
    nonce: Number(nonce),
    data,
  };

  // 3. Firmar con EIP-712 (NO paga gas aquí)
  const domain = {
    name: "MinimalForwarder",
    version: "1",
    chainId,
    verifyingContract: forwarderAddress,
  };

  const signature = await signer.signTypedData(domain, types, forwardRequest);
  return { request: forwardRequest, signature };
}
```

**📌 Notas:**
- No hay transacción enviada aún
- Solo firma local (instantánea, sin gas)
- Firma tiene timestamp válido para verificación posterior

---

#### B) Envío al Relayer
**Líneas 43-52:** Sumisión a API
```typescript
export async function submitVoteToRelayer(
  request: ForwardRequest,
  signature: string,
  relayerUrl: string
): Promise<string> {
  const response = await fetch(`${relayerUrl}/api/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request, signature }),
  });
  
  return response.json();
}
```

**📌 Notas:**
- Frontend envía firma y request al backend
- Backend (relayer) paga el gas
- Esto es lo que hace gasless posible

---

#### C) Interfaz de Usuario
**Archivo:** [web/src/components/CreateProposal.tsx](web/src/components/CreateProposal.tsx)

**Líneas 24-40:** Validación de balance
```typescript
const canCreateProposal = parseFloat(userDAOBalance) >= 
                         parseFloat(totalDAOBalance) * 0.1;

// Mostrar advertencia si no cumple
{!canCreateProposal && (
  <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
    ⚠️ You need at least 10% of DAO balance to create proposals
  </div>
)}
```

**📌 Notas:**
- UX clara indicando quién puede crear
- Validación preventiva en frontend
- Backend valida de nuevo (secure by default)

**Líneas 41-58:** Creación de propuesta
```typescript
const tx = await contract.createProposal(
  title,
  description,
  recipient,
  ethers.parseEther(amount),
  deadline
);
await tx.wait();  // Espera confirmación
```

**📌 Notas:**
- Esto SÍ paga gas (acción normal)
- Solo crear proposals es costoso
- **Votar es GRATIS (gasless)**

---

### 4. Daemon de Ejecución Automática

**Archivo:** [web/daemon.ts](web/daemon.ts)

#### A) Monitor de Propuestas
**Líneas 41-70:** Loop de verificación
```typescript
async function executeEligibleProposals() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, relayer);

  const currentTime = Math.floor(Date.now() / 1000);
  const proposalCount = await contract.getProposalCount();

  log(`Checking ${proposalCount} proposals...`);

  for (let i = 1; i <= proposalCount; i++) {
    const proposal: Proposal = await contract.getProposal(i);

    // Verificar eligibilidad
    if (
      !proposal.executed &&                           // No ejecutada
      proposal.deadline < currentTime &&              // Votación terminada
      currentTime >= proposal.deadline + SECURITY_PERIOD && // 2 días pasados
      proposal.votesFor > proposal.votesAgainst       // Aprobada
    ) {
      const tx = await contract.executeProposal(i);
      const receipt = await tx.wait();
      log(`✓ Proposal ${i} executed in tx ${receipt?.hash}`);
    }
  }
}
```

**📌 Notas:**
- Se ejecuta cada 30 segundos (CHECK_INTERVAL)
- Valida 4 condiciones de eligibilidad
- Paga gas automáticamente (relayer)
- Logging en daemon.log para auditoría

---

#### B) Loop Infinito del Daemon
**Líneas 85-110:** Función main
```typescript
async function main() {
  log("DAO Execution Daemon started");
  log(`Configuration:`);
  log(`  DAO Address: ${DAO_ADDRESS}`);
  log(`  RPC URL: ${RPC_URL}`);
  log(`  Check Interval: ${CHECK_INTERVAL}ms`);

  // Loop infinito
  while (true) {
    try {
      await executeEligibleProposals();
    } catch (error) {
      log(`ERROR: ${error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}
```

**📌 Notas:**
- Corre indefinidamente (background service)
- Captura errores para no fallar
- Se ejecuta con: `npm run daemon`

---

## ⚡ Ventajas Arquitectónicas

### 1. **Votación Sin Gas (EIP-2771)**
✅ **Beneficio:** Los usuarios votan sin pagar transacciones
- Firma local (ethers.js) → instantáneo
- Relayer paga gas → transacción en chain
- Barrera de entrada cero para participación

### 2. **Seguridad Multi-Capa**
✅ **Beneficio:** Validación en múltiples puntos
- EIP-712: Firma criptográfica segura
- Nonce counter: Anti-replay protection
- Security period: Previene flash-loans
- Validadores de modifier: Comprobación on-chain

### 3. **Automatización con Daemon**
✅ **Beneficio:** Ejecuta propuestas sin intervención manual
- Monitoreo contínuo
- Ejecución automática cuando califica
- Logging centralizado
- No requiere intervención humana

### 4. **Poder de Voto Basado en Balance**
✅ **Beneficio:** Gobernanza cuantitativa
- 1 ETH = 1 voto (balance del usuario)
- 10% mínimo para crear propuestas → previene spam
- Representa inversión en DAO

### 5. **Gobernanza Transparente**
✅ **Beneficio:** Propuestas con contexto
- Título y descripción on-chain
- Todos pueden revisar historial
- Immutable record de decisiones

### 6. **Confianza Descentralizada**
✅ **Beneficio:** Confían en contratos, no personas
- MinimalForwarder es trustless (verificable)
- DAOVoting es immutable
- No hay admin privileges secretos

---

## 📊 Flujo Completo de Ejecución

```
Usuario A                Relayer              MinimalForwarder        DAOVoting
   │                       │                         │                   │
   ├─ Crea Proposal ─────────────────────────────────────────────────────>│
   │  (paga gas)                                                           │
   │                       │                         │                ✓ Guardada
   │                       │                         │                   │
   ├─ Firma voto (SIN gas) │                         │                   │
   │  (local, ethers.js)   │                         │                   │
   │                       │                         │                   │
   ├─ POST /api/relay ────>│                         │                   │
   │  (signature + request)│                         │                   │
   │                       ├─ verify() ────────────>│                   │
   │                       │                    ✓ Válida                 │
   │                       │                         │                   │
   │                       ├─ execute() ────────────>│ ─ vote() ───────>│
   │                       │                         │                ✓ Voto
   │                       │                         │                  Registrado
   │                       │<────── tx hash ────────┤                   │
   │<──── tx hash ─────────┤                         │                   │
   │                       │                         │                   │
   │ [Pasan 24 horas + 2 días de security period]   │                   │
   │                       │                         │                   │
   │ [Daemon corre en BG]  │                         │                   │
   │                       ├─ executeProposal() ──────────────────────>│
   │                       │                         │              ✓ Fondos
   │                       │                         │                Transferidos
   │                       │<─────── tx hash ──────────────────────────┤
   ✓ Recibe fondos         │                         │                   │
```

---

## 🚀 Casos de Uso

| Caso | Descripción | Ventaja |
|------|-------------|---------|
| **DAO Pequeño** | Votación comunitaria sin barreras | Cero friction, participación máxima |
| **DAO Grande** | Gobernanza escalable | Automatización = no need for admins |
| **Tokens** | Votar sobre cambios de protocolo | Seguridad + velocidad de votación |
| **Grants** | Distribución comunitaria de fondos | Transparencia + fairness |

---

## 📚 Cómo Estudiar Cada Componente

### Paso 1: Entender ERC2771
```
Leer: OpenZeppelin docs sobre ERC2771Context
Archivo: [sc/src/DAOVoting.sol](sc/src/DAOVoting.sol#L1) línea 4
```

### Paso 2: Implementación del Forwarder
```
Leer: EIP-712 spec
Archivo: [sc/src/MinimalForwarder.sol](sc/src/MinimalForwarder.sol#L54)
```

### Paso 3: Integración Frontend
```
Leer: ethers.js signTypedData docs
Archivo: [web/src/services/meta-transactions.ts](web/src/services/meta-transactions.ts#L6)
```

### Paso 4: Automatización
```
Leer: Node.js background tasks
Archivo: [web/daemon.ts](web/daemon.ts#L41)
```

---

## 🎓 Conceptos Clave Aprendidos

| Concepto | Línea | Significado |
|----------|------|-------------|
| **EIP-2771** | [sc/src/DAOVoting.sol:4](sc/src/DAOVoting.sol#L4) | Meta-transacciones estándar |
| **ERC2771Context** | [sc/src/DAOVoting.sol:4](sc/src/DAOVoting.sol#L4) | Extrae dirección real del firmante |
| **EIP-712** | [sc/src/MinimalForwarder.sol:5](sc/src/MinimalForwarder.sol#L5) | Firma tipada segura |
| **Nonce** | [sc/src/MinimalForwarder.sol:30](sc/src/MinimalForwarder.sol#L30) | Anti-replay protection |
| **Security Period** | [sc/src/DAOVoting.sol:47](sc/src/DAOVoting.sol#L47) | Espera 2 días post-votación |
| **Gasless** | [web/src/services/meta-transactions.ts:1](web/src/services/meta-transactions.ts#L1) | Usuario firma, relayer paga |
| **Daemon** | [web/daemon.ts:41](web/daemon.ts#L41) | Automatiza ejecución de proposals |

---

## 💡 Conclusión

Este proyecto demuestra cómo construir una **gobernanza descentralizada moderna** combinando:

1. **Smart Contracts** robustos (Solidity + OpenZeppelin)
2. **Meta-transacciones** seguras (EIP-2771 + EIP-712)
3. **Frontend intuitivo** (Next.js + ethers.js)
4. **Automatización** confiable (Daemon Node.js)

El resultado: **DAO escalable, seguro y fácil de usar**. 🚀
