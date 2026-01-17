// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Ecommerce} from "../src/Ecommerce.sol";
import {IEuroToken} from "../src/IEuroToken.sol";

contract MockEuroToken is IEuroToken {
    uint8 public _decimals = 6;
    mapping(address => uint256) public _bal;

    function setBalance(address a, uint256 v) external { _bal[a] = v; }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(_bal[from] >= amount, "MockEURT: insufficient");
        _bal[from] -= amount;
        _bal[to] += amount;
        return true;
    }
    function balanceOf(address account) external view returns (uint256) { return _bal[account]; }
    function decimals() external view returns (uint8) { return _decimals; }
}

contract EcommerceTest is Test {
    Ecommerce ec;
    MockEuroToken eur;
    address merchant = address(0x123);
    address customer = address(0x456);

    function setUp() public {
        eur = new MockEuroToken();
        ec = new Ecommerce(IEuroToken(address(eur)));
        // registrar empresa
        vm.prank(merchant);
        uint256 companyId = ec.registerCompany("Mi Tienda", "TAX123");
        // agregar producto
        vm.prank(merchant);
        ec.addProduct(companyId, "Producto A", "Desc", 10 * 1e6, 100, "");
        // preparar saldo
        eur.setBalance(customer, 1000 * 1e6);
    }

    function testFullFlow() public {
        // customer agrega al carrito
        vm.prank(customer);
        ec.addToCart(1, 2); // 2 unidades x 10 EURT
        // crear invoice
        uint256 invId = ec.createInvoice(customer, 1);
        // pagar
        vm.prank(customer);
        ec.processPayment(customer, 20 * 1e6, invId);
        // verificar invoice pagada
        (, , , uint256 total,, bool paid,) = ec.getInvoice(invId);
        assertEq(total, 20 * 1e6);
        assertTrue(paid);
    }
}
