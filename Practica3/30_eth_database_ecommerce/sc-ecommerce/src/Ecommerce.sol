// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEuroToken} from "./IEuroToken.sol";
import {CompanyLib} from "./libs/CompanyLib.sol";
import {ProductLib} from "./libs/ProductLib.sol";
import {CartLib} from "./libs/CartLib.sol";
import {InvoiceLib} from "./libs/InvoiceLib.sol";
import {PaymentLib} from "./libs/PaymentLib.sol";

/// @title Ecommerce
/// @notice Contrato principal que gestiona empresas, productos, carritos e invoices
contract Ecommerce {
    using CompanyLib for mapping(uint256 => CompanyLib.Company);
    using ProductLib for mapping(uint256 => ProductLib.Product);
    using CartLib for mapping(address => CartLib.CartItem[]);
    using InvoiceLib for mapping(uint256 => InvoiceLib.Invoice);

    IEuroToken public euroToken;
    address public owner;

    // Storage
    mapping(uint256 => CompanyLib.Company) private companies;
    uint256 private nextCompanyId = 1;

    mapping(uint256 => ProductLib.Product) private products;
    uint256 private nextProductId = 1;

    mapping(address => CartLib.CartItem[]) private carts;

    mapping(uint256 => InvoiceLib.Invoice) private invoices;
    uint256 private nextInvoiceId = 1;

    // Access control
    mapping(address => uint256) public companyByOwner; // owner wallet -> companyId

    event OwnerChanged(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Ecommerce: not owner");
        _;
    }

    modifier onlyCompanyOwner(uint256 companyId) {
        require(companyByOwner[msg.sender] == companyId, "Ecommerce: not company owner");
        _;
    }

    constructor(IEuroToken _euroToken) {
        euroToken = _euroToken;
        owner = msg.sender;
        emit OwnerChanged(address(0), owner);
    }

    // Empresas
    function registerCompany(string memory name, string memory taxId) external returns (uint256) {
        uint256 id = companies.register(nextCompanyId, name, msg.sender, taxId);
        companyByOwner[msg.sender] = id;
        nextCompanyId++;
        return id;
    }

    function getCompany(uint256 companyId) external view returns (CompanyLib.Company memory) {
        return companies.get(companyId);
    }

    // Productos
    function addProduct(uint256 companyId, string memory name, string memory description, uint256 price, uint256 stock, string memory ipfsImageHash) external onlyCompanyOwner(companyId) returns (uint256) {
        uint256 id = products.add(nextProductId, companyId, name, description, price, stock, ipfsImageHash);
        nextProductId++;
        return id;
    }

    function updateProduct(uint256 productId, uint256 price, uint256 stock, bool isActive) external {
        ProductLib.Product memory p = products[productId];
        require(p.productId != 0, "Ecommerce: product not found");
        uint256 companyId = p.companyId;
        require(companyByOwner[msg.sender] == companyId, "Ecommerce: not company owner");
        products.update(productId, price, stock, isActive);
    }

    function getAllProducts() external view returns (ProductLib.Product[] memory) {
        ProductLib.Product[] memory list = new ProductLib.Product[](nextProductId - 1);
        for (uint256 i = 1; i < nextProductId; i++) {
            list[i - 1] = products[i];
        }
        return list;
    }

    // Carrito
    function addToCart(uint256 productId, uint256 quantity) external {
        carts.add(msg.sender, productId, quantity);
    }

    function getCart(address customer) external view returns (CartLib.CartItem[] memory) {
        return carts.get(customer);
    }

    function clearCart(address customer) external {
        require(customer == msg.sender, "Ecommerce: only self");
        carts.clear(customer);
    }

    // Invoices
    function createInvoice(address customer, uint256 companyId) external returns (uint256) {
        CartLib.CartItem[] memory items = carts.get(customer);
        uint256 id = invoices.create(nextInvoiceId, customer, companyId, items, _priceOf);
        nextInvoiceId++;
        return id;
    }

    function processPayment(address customer, uint256 amount, uint256 invoiceId) external {
        CompanyLib.Company memory comp = companies.get(invoices[invoiceId].companyId);
        bytes32 txHash = PaymentLib.processPayment(euroToken, customer, comp.companyAddress, amount, invoiceId);
        invoices.markPaid(invoiceId, txHash);
    }

    function getInvoice(uint256 invoiceId) external view returns (InvoiceLib.Invoice memory) {
        return invoices[invoiceId];
    }

    // Helper: obtener precio de producto validando la empresa
    function _priceOf(uint256 productId, uint256 companyId) internal view returns (uint256) {
        ProductLib.Product memory p = products[productId];
        require(p.productId != 0 && p.companyId == companyId && p.isActive, "Ecommerce: invalid product");
        return p.price;
    }
}
