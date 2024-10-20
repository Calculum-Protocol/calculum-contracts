// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20Upgradeable} from "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";

contract USDC is ERC20Upgradeable {
    address public admin;

    constructor() ERC20Upgradeable() {
        __ERC20_init("USDC Bear Protocol", "bpUSDC5");
        _mint(msg.sender, 1000000 * 10 ** 6);
        admin = msg.sender;
    }

    // Allows the admin to mint new tokens to a specified address
    function mint(address to, uint256 amount) external {
        require(msg.sender == admin, "Only Admin allowed");
        _mint(to, amount);
    }

    // Returns the number of decimal places used by the token
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Allows the caller to burn a specified amount of tokens from their balance
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
