// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library ProductLib {
    struct Product {
        uint256 productId;
        uint256 companyId;
        string name;
        string description;
        uint256 price; // 6 decimals
        uint256 stock;
        string ipfsImageHash;
        bool isActive;
    }

    event ProductAdded(uint256 indexed productId, uint256 indexed companyId, string name, uint256 price, uint256 stock);
    event ProductUpdated(uint256 indexed productId, uint256 price, uint256 stock, bool isActive);

    function add(mapping(uint256 => Product) storage products, uint256 nextId, uint256 companyId, string memory name, string memory description, uint256 price, uint256 stock, string memory ipfsImageHash) internal returns (uint256) {
        require(price > 0, "Product: price=0");
        uint256 id = nextId;
        products[id] = Product({productId: id, companyId: companyId, name: name, description: description, price: price, stock: stock, ipfsImageHash: ipfsImageHash, isActive: true});
        emit ProductAdded(id, companyId, name, price, stock);
        return id;
    }

    function update(mapping(uint256 => Product) storage products, uint256 productId, uint256 price, uint256 stock, bool isActive) internal {
        Product storage p = products[productId];
        require(p.productId != 0, "Product: not found");
        p.price = price;
        p.stock = stock;
        p.isActive = isActive;
        emit ProductUpdated(productId, price, stock, isActive);
    }
}
