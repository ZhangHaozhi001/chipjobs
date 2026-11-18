// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice TapeOut processor factory on X Layer mainnet:
///         0x1f09daefa827f02cbb40967cc91b259763760761 (chainId 196).
///         Interface subset per TapeKit SPEC.md Appendix B.1 — read-only usage.
interface ITapeOutFactory {
    /// @notice Number of processors ever created (append-only).
    function cpuCount() external view returns (uint256);
    /// @notice Circuit NFT contract of processor `i`; reverts when i >= cpuCount().
    function cpuAt(uint256 i) external view returns (address);
    /// @notice Whether `a` is a processor contract created by this factory.
    function isCPU(address a) external view returns (bool);
}

/// @notice A TapeOut processor contract is an ERC-721 whose tokens are circuits.
///         A circuit is identified by (processor index, tokenId) — "#ID @ processor".
///         Interface subset per TapeKit SPEC.md Appendix B.3 — read-only usage.
interface ICircuitCPU {
    /// @notice Holder of circuit #tokenId; reverts when the #ID does not exist.
    function ownerOf(uint256 tokenId) external view returns (address);
    /// @notice Processor display name (not unique; display only).
    function name() external view returns (string memory);
}
