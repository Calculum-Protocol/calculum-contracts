// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./ISpotEngine.sol";
import "./IPerpEngine.sol";

interface IFQuerier {
    struct SpotBalance {
        uint32 productId;
        ISpotEngine.LpBalance lpBalance;
        ISpotEngine.Balance balance;
    }

    struct PerpBalance {
        uint32 productId;
        IPerpEngine.LpBalance lpBalance;
        IPerpEngine.Balance balance;
    }

    // legacy risk to maintain backcompat
    struct LegacyRisk {
        int128 longWeightInitialX18;
        int128 shortWeightInitialX18;
        int128 longWeightMaintenanceX18;
        int128 shortWeightMaintenanceX18;
        int128 largePositionPenaltyX18;
    }

    struct BookInfo {
        int128 sizeIncrement;
        int128 priceIncrementX18;
        int128 minSize;
        int128 collectedFees;
        int128 lpSpreadX18;
    }

    // for config just go to the chain
    struct SpotProduct {
        uint32 productId;
        int128 oraclePriceX18;
        LegacyRisk risk;
        ISpotEngine.Config config;
        ISpotEngine.State state;
        ISpotEngine.LpState lpState;
        BookInfo bookInfo;
    }

    struct PerpProduct {
        uint32 productId;
        int128 oraclePriceX18;
        LegacyRisk risk;
        IPerpEngine.State state;
        IPerpEngine.LpState lpState;
        BookInfo bookInfo;
    }

    struct HealthInfo {
        int128 assets;
        int128 liabilities;
        int128 health;
    }

    struct SubaccountInfo {
        bytes32 subaccount;
        bool exists;
        HealthInfo[] healths;
        int128[][] healthContributions;
        uint32 spotCount;
        uint32 perpCount;
        SpotBalance[] spotBalances;
        PerpBalance[] perpBalances;
        SpotProduct[] spotProducts;
        PerpProduct[] perpProducts;
    }

    function getSpotBalance(
        bytes32 subaccount,
        uint32 productId
    ) external returns (SpotBalance memory);

    function getSubaccountInfo(
        bytes32 subaccount
    ) external returns (SubaccountInfo memory);

    function getPerpProduct(
        uint32 productId
    ) external returns (PerpProduct memory);
}
