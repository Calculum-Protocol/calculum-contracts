// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./ISpotEngine.sol";

interface IFQuerier {
    struct SpotBalance {
        uint32 productId;
        ISpotEngine.LpBalance lpBalance;
        ISpotEngine.Balance balance;
    }

    function getSpotBalance(bytes32 subaccount, uint32 productId)
        external
        returns (SpotBalance memory);
}
