// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {EuroToken} from "../src/EuroToken.sol";

contract EuroTokenTest is Test {
    EuroToken token;
    address owner = address(0xA11CE);
    address user1 = address(0xBEEF);
    address user2 = address(0xCAFE);

    function setUp() public {
        vm.prank(owner);
        token = new EuroToken();
    }

    function testDeploy() public {
        assertEq(token.decimals(), 6);
        assertEq(token.owner(), owner);
        assertEq(token.symbol(), "EURT");
        assertEq(token.name(), "EuroToken");
    }

    function testMintByOwner() public {
        vm.prank(owner);
        token.mint(user1, 100 * 1e6);
        assertEq(token.balanceOf(user1), 100 * 1e6);
    }

    function testFailMintByNotOwner() public {
        vm.prank(user1);
        token.mint(user1, 1e6);
    }

    function testTransferBetweenAccounts() public {
        vm.prank(owner);
        token.mint(user1, 50 * 1e6);

        vm.prank(user1);
        token.transfer(user2, 10 * 1e6);
        assertEq(token.balanceOf(user1), 40 * 1e6);
        assertEq(token.balanceOf(user2), 10 * 1e6);
    }
}
