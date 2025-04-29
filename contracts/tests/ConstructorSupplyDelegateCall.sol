// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

interface IWETHGateway {
    function depositETH(
        address lendingPool,
        address onBehalfOf,
        uint16 referralCode
    ) external payable;

    function borrowETH(
        address lendingPool,
        address onBehalfOf,
        uint16 referralCode
    ) external;
}

// this is not an attack
// because delegate call imports the fn from the aave contract and runs it in the context
// of this contract, not effecting the aave contract in any way at all
contract ConstructorSupplyDelegateCall {
    constructor(
        address wethGateway,
        address lendingPool,
        //  address onBehalfOf,
        uint16 referralCode
    ) payable {
        // Now we can call supplyETH directly since it is public
        borrowETH(wethGateway, lendingPool, 10, 2, referralCode);
    }

    // Changed from external to public so that it can be called internally
    function supplyETH(
        address wethGateway,
        address lendingPool,
        address onBehalfOf,
        uint16 referralCode
    ) public payable {
        // Delegatecall to the WETHGateway's depositETH function.
        // Note: delegatecall does not allow an inline value clause; msg.value is automatically preserved.
        (bool success, ) = wethGateway.delegatecall(
            abi.encodeWithSelector(
                IWETHGateway.depositETH.selector,
                lendingPool,
                onBehalfOf,
                referralCode
            )
        );
        require(success, "Delegatecall failed");
    }

    function borrowETH(
        address wethGateway,
        address lendingPool,
        uint256 amount,
        uint256 interesRateMode,
        uint16 referralCode
    ) public payable {
        // Delegatecall to the WETHGateway's depositETH function.
        // Note: delegatecall does not allow an inline value clause; msg.value is automatically preserved.
        (bool success, ) = wethGateway.delegatecall(
            abi.encodeWithSelector(
                IWETHGateway.borrowETH.selector,
                lendingPool,
                amount,
                interesRateMode,
                referralCode
            )
        );
        require(success, "Delegatecall failed");
    }
}
