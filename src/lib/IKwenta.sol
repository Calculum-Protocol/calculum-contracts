// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IAccount.sol";

interface IKwenta is IAccount {
    // Mapping of Address is Delegate or not
    function delegates(address delegate) external view returns (bool);

    // Function to Add Delegate
    function addDelegate(address _delegate) external;

    // Function to Remove Delegate
    function removeDelegate(address _delegate) external;

    // Create Account
    function newAccount() external returns (address payable accountAddress);
}
