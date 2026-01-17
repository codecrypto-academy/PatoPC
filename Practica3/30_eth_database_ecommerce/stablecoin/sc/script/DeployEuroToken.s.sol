// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {EuroToken} from "../src/EuroToken.sol";

/// @notice Deploy EuroToken y realiza mint inicial
contract DeployEuroToken is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address initialTo = vm.envAddress("INITIAL_MINT_TO");
        uint256 initialAmount = 1_000_000 * 1e6; // 1,000,000 EURT con 6 decimales

        vm.startBroadcast(pk);
        EuroToken token = new EuroToken();
        console.log("EuroToken deployed:", address(token));
        token.mint(initialTo, initialAmount);
        console.log("Minted", initialAmount, "to", initialTo);
        vm.stopBroadcast();
    }
}
