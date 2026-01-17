// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CartLib} from "./CartLib.sol";

library InvoiceLib {
    using CartLib for mapping(address => CartLib.CartItem[]);

    struct Invoice {
        uint256 invoiceId;
        uint256 companyId;
        address customerAddress;
        uint256 totalAmount;
        uint256 timestamp;
        bool isPaid;
        bytes32 paymentTxHash;
    }

    event InvoiceCreated(uint256 indexed invoiceId, uint256 indexed companyId, address indexed customer, uint256 totalAmount);
    event InvoicePaid(uint256 indexed invoiceId, bytes32 paymentTxHash);

    function create(mapping(uint256 => Invoice) storage invoices, uint256 nextId, address customer, uint256 companyId, CartLib.CartItem[] memory items, function(uint256,uint256) view returns (uint256) priceOf) internal returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < items.length; i++) {
            uint256 price = priceOf(items[i].productId, companyId);
            total += price * items[i].quantity;
        }
        uint256 id = nextId;
        invoices[id] = Invoice({invoiceId: id, companyId: companyId, customerAddress: customer, totalAmount: total, timestamp: block.timestamp, isPaid: false, paymentTxHash: bytes32(0)});
        emit InvoiceCreated(id, companyId, customer, total);
        return id;
    }

    function markPaid(mapping(uint256 => Invoice) storage invoices, uint256 invoiceId, bytes32 txHash) internal {
        Invoice storage inv = invoices[invoiceId];
        require(inv.invoiceId != 0, "Invoice: not found");
        inv.isPaid = true;
        inv.paymentTxHash = txHash;
        emit InvoicePaid(invoiceId, txHash);
    }
}
