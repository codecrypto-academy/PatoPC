// Archivo: sc/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DocumentRegistry.sol";

contract DeployScript is Script {
    function run() external {
        // Obtiene la clave privada del entorno o usa la predeterminada de Anvil (Account 0)
        // NOTA: Para deploy real, usa vm.envUint("PRIVATE_KEY");
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        DocumentRegistry registry = new DocumentRegistry();
        
        console.log("--------------------------------------------------");
        console.log("DocumentRegistry deployed to:", address(registry));
        console.log("--------------------------------------------------");

        vm.stopBroadcast();
    }
}