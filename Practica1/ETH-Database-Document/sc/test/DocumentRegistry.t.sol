// Archivo: sc/test/DocumentRegistry.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DocumentRegistry.sol";

contract DocumentRegistryTest is Test {
    DocumentRegistry public registry;
    address public user1 = address(0x123);
    address public user2 = address(0x456);

    function setUp() public {
        registry = new DocumentRegistry();
    }

    function testStoreDocument() public {
        bytes32 hash = keccak256("doc1");
        bytes memory signature = hex"1122";
        
        vm.prank(user1);
        registry.storeDocumentHash(hash, block.timestamp, signature, user1);
        
        assertTrue(registry.isDocumentStored(hash));
        assertEq(registry.getDocumentCount(), 1);
    }

    function testCannotStoreDuplicate() public {
        bytes32 hash = keccak256("doc1");
        bytes memory signature = hex"1122";

        registry.storeDocumentHash(hash, block.timestamp, signature, user1);

        vm.expectRevert("Error: Document already exists");
        registry.storeDocumentHash(hash, block.timestamp, signature, user1);
    }

    function testVerifyDocumentSuccess() public {
        bytes32 hash = keccak256("doc_verify");
        bytes memory sig = hex"AABB";
        
        registry.storeDocumentHash(hash, block.timestamp, sig, user1);
        
        bool isValid = registry.verifyDocument(hash, user1, sig);
        assertTrue(isValid);
    }

    function testVerifyDocumentFailBadSigner() public {
        bytes32 hash = keccak256("doc_fail");
        bytes memory sig = hex"AABB";
        
        registry.storeDocumentHash(hash, block.timestamp, sig, user1);
        
        // Verificamos con user2 en lugar de user1
        bool isValid = registry.verifyDocument(hash, user2, sig);
        assertFalse(isValid);
    }

    function testGetDocumentInfo() public {
        bytes32 hash = keccak256("info");
        uint256 ts = 1234567890;
        
        registry.storeDocumentHash(hash, ts, hex"FF", user1);
        
        DocumentRegistry.Document memory doc = registry.getDocumentInfo(hash);
        assertEq(doc.signer, user1);
        assertEq(doc.timestamp, ts);
    }

    function testFailGetNonExistentInfo() public {
        vm.expectRevert("Error: Document does not exist");
        registry.getDocumentInfo(keccak256("nothing"));
    }

    function testGetDocumentByIndex() public {
        bytes32 hash1 = keccak256("1");
        bytes32 hash2 = keccak256("2");

        registry.storeDocumentHash(hash1, block.timestamp, hex"00", user1);
        registry.storeDocumentHash(hash2, block.timestamp, hex"00", user1);

        assertEq(registry.getDocumentHashByIndex(0), hash1);
        assertEq(registry.getDocumentHashByIndex(1), hash2);
    }
}