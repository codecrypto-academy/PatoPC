// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CartLib {
    struct CartItem {
        uint256 productId;
        uint256 quantity;
    }

    event CartItemAdded(address indexed customer, uint256 productId, uint256 quantity);
    event CartCleared(address indexed customer);

    function add(mapping(address => CartItem[]) storage carts, address customer, uint256 productId, uint256 quantity) internal {
        require(quantity > 0, "Cart: qty=0");
        carts[customer].push(CartItem({productId: productId, quantity: quantity}));
        emit CartItemAdded(customer, productId, quantity);
    }

    function get(mapping(address => CartItem[]) storage carts, address customer) internal view returns (CartItem[] memory) {
        return carts[customer];
    }

    function clear(mapping(address => CartItem[]) storage carts, address customer) internal {
        delete carts[customer];
        emit CartCleared(customer);
    }
}
