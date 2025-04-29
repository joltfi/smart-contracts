// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OFT} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title JoltOFT Token
/// @notice OFT token with controlled minting and burning features.
contract JoltOFT is OFT {
    /// @notice Address authorized to mint tokens.
    address public minter;
    /// @notice Constant burn address.
    address public constant BURN_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    /// @notice Emitted when a new minter is set.
    event MinterUpdated(address indexed newMinter);
    /// @notice Emitted when tokens are minted.
    event Mint(address indexed to, uint256 value);

    /// @notice Constructor initializes the OFT and Ownable base contracts.
    /// @param _name Token name.
    /// @param _symbol Token symbol.
    /// @param _lzEndpoint LayerZero endpoint address.
    /// @param _delegate Initial owner and delegate.
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}

    /// @notice Sets the authorized minter address.
    /// @param _minter Address to be set as minter.
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
        emit MinterUpdated(_minter);
    }

    /// @notice Mints new tokens to a specified address.
    /// @param _to Recipient address.
    /// @param _value Amount of tokens to mint.
    function mint(address _to, uint256 _value) external {
        require(
            msg.sender == owner() ||
                (minter != address(0) && msg.sender == minter)
        );
        require(_to != address(0), "Cannot mint to zero address");
        require(_value > 0, "Mint value must be greater than 0");
        _mint(_to, _value);
        emit Mint(_to, _value);
    }

    /// @notice Returns the circulating supply excluding tokens at the burn address.
    /// @return The circulating token supply.
    function circulatingSupply() public view returns (uint256) {
        return totalSupply() - balanceOf(BURN_ADDRESS);
    }
}
