// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MinimalForwarder.sol";

// Simple contract to receive calls from forwarder
contract MockRecipient {
    uint256 public value;
    address public lastCaller;

    function setValue(uint256 _value) public {
        value = _value;
        lastCaller = msg.sender;
    }

    receive() external payable {}
}

contract MinimalForwarderTest is Test {
    MinimalForwarder forwarder;
    MockRecipient recipient;

    address alice = makeAddr("alice");
    address relayer = makeAddr("relayer");

    function setUp() public {
        forwarder = new MinimalForwarder();
        recipient = new MockRecipient();

        vm.deal(alice, 100 ether);
        vm.deal(relayer, 100 ether);
    }

    function test_GetNonce() public {
        assertEq(forwarder.getNonce(alice), 0);
    }

    function test_VerifyValidSignature() public {
        uint256 privateKey = 0x1;
        address signer = vm.addr(privateKey);
        
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder
            .ForwardRequest({
                from: signer,
                to: address(recipient),
                value: 0,
                gas: 100000,
                nonce: 0,
                data: abi.encodeWithSignature("setValue(uint256)", 42)
            });

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
                ),
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );

        bytes32 digest = forwarder.hashTypedDataV4(structHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify signature is valid
        assertTrue(forwarder.verify(req, signature));
    }

    function test_ExecuteMetaTransaction() public {
        uint256 privateKey = 0x1;
        address signer = vm.addr(privateKey);
        
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder
            .ForwardRequest({
                from: signer,
                to: address(recipient),
                value: 0,
                gas: 100000,
                nonce: 0,
                data: abi.encodeWithSignature("setValue(uint256)", 42)
            });

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
                ),
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );

        bytes32 digest = forwarder.hashTypedDataV4(structHash);
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        (bool success, ) = forwarder.execute{value: 0}(req, signature);
        assertTrue(success);
    }

    function test_NonceIncrementsAfterExecution() public {
        uint256 privateKey = 0x1;
        address signer = vm.addr(privateKey);
        
        assertEq(forwarder.getNonce(signer), 0);

        MinimalForwarder.ForwardRequest memory req = MinimalForwarder
            .ForwardRequest({
                from: signer,
                to: address(recipient),
                value: 0,
                gas: 100000,
                nonce: 0,
                data: abi.encodeWithSignature("setValue(uint256)", 42)
            });

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
                ),
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );

        bytes32 digest = forwarder.hashTypedDataV4(structHash);
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        forwarder.execute{value: 0}(req, signature);

        assertEq(forwarder.getNonce(signer), 1);
    }

    function test_ReplayAttackPrevention() public {
        uint256 privateKey = 0x1;
        address signer = vm.addr(privateKey);
        
        MinimalForwarder.ForwardRequest memory req = MinimalForwarder
            .ForwardRequest({
                from: signer,
                to: address(recipient),
                value: 0,
                gas: 100000,
                nonce: 0,
                data: abi.encodeWithSignature("setValue(uint256)", 42)
            });

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
                ),
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );

        bytes32 digest = forwarder.hashTypedDataV4(structHash);
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        forwarder.execute{value: 0}(req, signature);

        // Try to execute same signature again - should fail
        vm.prank(relayer);
        vm.expectRevert("MinimalForwarder: invalid signature");
        forwarder.execute{value: 0}(req, signature);
    }
}
