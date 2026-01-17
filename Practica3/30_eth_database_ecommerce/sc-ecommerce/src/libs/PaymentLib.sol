// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEuroToken} from "../IEuroToken.sol";

library PaymentLib {
    event PaymentProcessed(address indexed customer, address indexed merchant, uint256 amount, uint256 invoiceId);

    function processPayment(IEuroToken token, address customer, address merchant, uint256 amount, uint256 invoiceId) internal returns (bytes32) {
        bool ok = token.transferFrom(customer, merchant, amount);
        require(ok, "Payment: transfer failed");
        emit PaymentProcessed(customer, merchant, amount, invoiceId);
        return bytes32(0); // tx hash puede actualizarse fuera (pasarela)
    }
}
