// Archivo: sc/src/DocumentRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentRegistry
 * @dev Almacenamiento descentralizado de hashes de documentos con firmas digitales.
 */
contract DocumentRegistry {
    
    struct Document {
        bytes32 hash;       // Hash único del archivo (keccak256)
        uint256 timestamp;  // Fecha de registro
        bytes signature;    // Firma criptográfica del hash
        address signer;     // Dirección de la wallet que firmó
    }

    // Mapping principal: Hash -> Datos del Documento
    mapping(bytes32 => Document) public documents;
    
    // Array para mantener un historial iterable (necesario para la UI)
    bytes32[] public documentHashes;

    event DocumentStored(bytes32 indexed hash, address indexed signer, uint256 timestamp);

    // Modificador: Verifica que el documento NO exista antes de guardar
    modifier documentNotExists(bytes32 _hash) {
        require(documents[_hash].signer == address(0), "Error: Document already exists");
        _;
    }

    // Modificador: Verifica que el documento SÍ exista antes de consultar
    modifier documentExists(bytes32 _hash) {
        require(documents[_hash].signer != address(0), "Error: Document does not exist");
        _;
    }

    /**
     * @notice Guarda el hash de un documento y su firma
     */
    function storeDocumentHash(
        bytes32 _hash,
        uint256 _timestamp,
        bytes memory _signature,
        address _signer
    ) external documentNotExists(_hash) {
        require(_signer != address(0), "Invalid signer address");
        require(_hash != bytes32(0), "Invalid hash");

        Document memory newDoc = Document({
            hash: _hash,
            timestamp: _timestamp,
            signature: _signature,
            signer: _signer
        });

        documents[_hash] = newDoc;
        documentHashes.push(_hash);

        emit DocumentStored(_hash, _signer, _timestamp);
    }

    /**
     * @notice Verifica la validez de un documento comparando los datos provistos con los almacenados
     */
    function verifyDocument(
        bytes32 _hash,
        address _signer,
        bytes memory _signature
    ) external view returns (bool) {
        // 1. Si no existe, retorna falso inmediatamente
        if (documents[_hash].signer == address(0)) {
            return false;
        }

        Document memory doc = documents[_hash];

        // 2. Compara todos los campos críticos
        bool isHashMatch = doc.hash == _hash;
        bool isSignerMatch = doc.signer == _signer;
        bool isSignatureMatch = keccak256(doc.signature) == keccak256(_signature);

        return isHashMatch && isSignerMatch && isSignatureMatch;
    }

    // --- Getters & Helpers ---

    function getDocumentInfo(bytes32 _hash) external view documentExists(_hash) returns (Document memory) {
        return documents[_hash];
    }

    function isDocumentStored(bytes32 _hash) external view returns (bool) {
        return documents[_hash].signer != address(0);
    }

    function getDocumentCount() external view returns (uint256) {
        return documentHashes.length;
    }

    function getDocumentHashByIndex(uint256 _index) external view returns (bytes32) {
        require(_index < documentHashes.length, "Index out of bounds");
        return documentHashes[_index];
    }
}