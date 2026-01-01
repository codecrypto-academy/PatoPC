// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title MinimalForwarder
 * @dev Minimal implementation of EIP-2771 meta-transaction forwarder
 * Allows transactions to be relayed on behalf of users without them paying gas
 */
contract MinimalForwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    bytes32 private constant TYPEHASH =
        keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
        );

    mapping(address => uint256) private _nonces;

    event MetaTransactionExecuted(
        address indexed from,
        address indexed to,
        bytes result
    );

    constructor() EIP712("MinimalForwarder", "1") {}

    /**
     * @dev Get the nonce for a specific user
     * @param from User address
     * @return Current nonce value
     */
    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @dev Hash data with EIP-712 domain separator (public for testing)
     * @param structHash The struct hash
     * @return The digest
     */
    function hashTypedDataV4(bytes32 structHash)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(structHash);
    }

    /**
     * @dev Verify the signature of a forward request
     * @param req The forward request
     * @param signature The signature bytes
     * @return true if signature is valid, false otherwise
     */
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

        return signer == req.from && req.nonce == _nonces[req.from];
    }

    /**
     * @dev Execute a meta-transaction if the signature is valid
     * @param req The forward request
     * @param signature The signature bytes
     * @return success Whether the call succeeded
     * @return result The return data from the call
     */
    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool success, bytes memory result)
    {
        require(verify(req, signature), "MinimalForwarder: invalid signature");
        require(msg.value >= req.value, "MinimalForwarder: insufficient value");

        _nonces[req.from]++;

        (success, result) = req.to.call{value: req.value, gas: req.gas}(
            abi.encodePacked(req.data, req.from)
        );

        require(success, "MinimalForwarder: call failed");

        emit MetaTransactionExecuted(req.from, req.to, result);

        // Return excess value
        if (msg.value > req.value) {
            (bool refundSuccess, ) = msg.sender.call{
                value: msg.value - req.value
            }("");
            require(refundSuccess, "MinimalForwarder: refund failed");
        }
    }
}
