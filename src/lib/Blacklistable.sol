// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";

/**
 * @title Blacklistable Methods
 * @dev Allows accounts to be blacklisted by Owner
 * @custom:a Alfredo Lopez / Calculum
 */
contract Blacklistable is OwnableUpgradeable {
    // Index Address
    address[] private wallets;
    // Mapping blacklisted Address
    mapping(address => bool) private blacklisted;
    // Events when add or drop a wallets in the blacklisted mapping

    event InBlacklisted(address indexed _account);
    event OutBlacklisted(address indexed _account);

    /**
     * @dev Throws if argument account is blacklisted
     * @param _account The address to check
     */
    modifier notBlacklisted(address _account) {
        require(!blacklisted[_account], "ERC20 Vault: sender account is blacklisted");
        _;
    }

    /**
     * @dev Throws if a given address is equal to address(0)
     * @param _to The address to check
     */
    modifier validAddress(address _to) {
        require(_to != address(0), "ERC20 Vault: Not Add Zero Address");
        /* solcov ignore next */
        _;
    }

    /**
     * @dev Checks if account is blacklisted
     * @param _account The address to check
     */
    function isBlacklisted(address _account) public view returns (bool) {
        return blacklisted[_account];
    }

    /**
     * @dev Adds account to blacklist
     * @param _account The address to blacklist
     */
    function addBlacklist(address _account)
        public
        validAddress(_account)
        /// notBlacklisted(_account)
        onlyOwner
    {
        blacklisted[_account] = true;
        wallets.push(_account);
        emit InBlacklisted(_account);
    }

    /**
     * @dev Removes account from blacklist
     * @param _account The address to remove from the blacklist
     */
    function dropBlacklist(address _account) public validAddress(_account) onlyOwner {
        require(isBlacklisted(_account), "ERC20 Vault: Wallet don't exist");
        blacklisted[_account] = false;
        emit OutBlacklisted(_account);
    }

    /**
     * @dev Getting the List of Address Blacklisted
     */
    function getBlacklist() public view returns (address[] memory) {
        return wallets;
    }
}
