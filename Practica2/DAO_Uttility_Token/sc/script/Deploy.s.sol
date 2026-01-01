// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MinimalForwarder.sol";
import "../src/DAOVoting.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Ensure the deployer has test funds in the local EVM
        // vm.deal sets the balance of an address in the EVM (available in Foundry)
        vm.deal(deployer, 10000 ether);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MinimalForwarder
        MinimalForwarder forwarder = new MinimalForwarder();
        console.log("MinimalForwarder deployed at:", address(forwarder));

        // Deploy DAOVoting
        DAOVoting dao = new DAOVoting(address(forwarder));
        console.log("DAOVoting deployed at:", address(dao));

        vm.stopBroadcast();

        // Log addresses to be used in frontend
        console.log("\n========== DEPLOYMENT SUMMARY ==========");
        console.log("MinimalForwarder Address:", address(forwarder));
        console.log("DAOVoting Address:", address(dao));
        console.log("========================================\n");
    }
}
