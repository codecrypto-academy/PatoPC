// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title EuroToken (EURT) - Stablecoin con 6 decimales
/// @notice ERC20 con función mint controlada por owner
contract EuroToken is ERC20 {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Mint(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "EuroToken: not owner");
        _;
    }

    constructor() ERC20("EuroToken", "EURT") {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "EuroToken: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @dev 6 decimales para representar centavos de euro
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Crea nuevos tokens. Solo el owner puede llamar.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Mint(to, amount);
    }
}
