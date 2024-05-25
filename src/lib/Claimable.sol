// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Events.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";

// import "./Blacklistable.sol";

/**
 * @title Claimable Methods
 * @dev Implementation of the claiming utils that can be useful for withdrawing accidentally sent tokens that are not used in bridge operations.
 * @custom:a Alfredo Lopez / Calculum
 */
abstract contract Claimable is OwnableUpgradeable, Events {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;

    // Event when the Smart Contract receive Amount of Native or ERC20 tokens

    /// @notice Handle receive ether
    receive() external payable {
        emit ValueReceived(_msgSender(), msg.value);
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
     * @dev Withdraws the erc20 tokens or native coins from this contract.
     * Caller should additionally check that the claimed token is not a part of bridge operations (i.e. that token != erc20token()).
     * @param _token address of the claimed token or address(0) for native coins.
     * @param _to address of the tokens/coins receiver.
     */
    function claimValues(address _token, address _to) public onlyOwner validAddress(_to) 
    /// /// notBlacklisted(_to)
    {
        if (_token == address(0)) {
            _claimNativeCoins(_to);
        } else {
            require(_token.isContract(), "ERC20 Vault: Address: not a contract");
            _claimErc20Tokens(_token, _to);
        }
    }

    /**
     * @dev Internal function for withdrawing all native coins from the contract.
     * @param _to address of the coins receiver.
     */
    function _claimNativeCoins(address _to) private {
        uint256 amount = address(this).balance;

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success,) = _to.call{value: amount}("");
        require(success, "ERC20: Address: unable to send value, recipient may have reverted");
    }

    /**
     * @dev Internal function for withdrawing all tokens of some particular ERC20 contract from this contract.
     * @param _token address of the claimed ERC20 token.
     * @param _to address of the tokens receiver.
     */
    function _claimErc20Tokens(address _token, address _to) private {
        IERC20Upgradeable token = IERC20Upgradeable(_token);
        uint256 balance = token.balanceOf(address(this));
        token.safeTransfer(_to, balance);
    }

    /**
     * @dev Internal function for withdrawing all tokens of some particular ERC721 contract from this contract.
     * @param _token address of the claimed ERC721 token.
     * @param _to address of the tokens receiver.
     */
    function _claimErc721Tokens(address _token, address _to) public validAddress(_to) onlyOwner {
        IERC721Upgradeable token = IERC721Upgradeable(_token);
        uint256 balance = token.balanceOf(address(this));
        token.safeTransferFrom(address(this), _to, balance);
    }

    /**
     * @dev Internal function for withdrawing all tokens of some particular ERC721 contract from this contract.
     * @param _token address of the claimed ERC721 token.
     * @param _to address of the tokens receiver.
     */
    function _claimErc1155Tokens(address _token, address _to, uint256 _id)
        public
        validAddress(_to)
        onlyOwner
    {
        IERC1155Upgradeable token = IERC1155Upgradeable(_token);
        uint256 balance = token.balanceOf(address(this), _id);
        bytes memory data = "0x00";
        token.safeTransferFrom(address(this), _to, _id, balance, data);
    }
}
