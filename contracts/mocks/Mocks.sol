// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Local stand-ins for the TapeOut mainnet contracts, used ONLY by the
///         local demo/tests (TapeOut has no testnet deployment). They mirror
///         the real interfaces in ../ITapeOut.sol one-to-one.
contract MockCPU {
    string public name;
    mapping(uint256 => address) private _owners;

    constructor(string memory name_) {
        name = name_;
    }

    function mint(address to, uint256 tokenId) external {
        require(_owners[tokenId] == address(0), "exists");
        _owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "no such token");
        return o;
    }
}

contract MockFactory {
    address[] public cpus;

    function addCPU(address cpu) external returns (uint256) {
        cpus.push(cpu);
        return cpus.length - 1;
    }

    function cpuCount() external view returns (uint256) {
        return cpus.length;
    }

    function cpuAt(uint256 i) external view returns (address) {
        require(i < cpus.length, "out of range");
        return cpus[i];
    }

    function isCPU(address a) external view returns (bool) {
        for (uint256 i = 0; i < cpus.length; i++) {
            if (cpus[i] == a) return true;
        }
        return false;
    }
}
