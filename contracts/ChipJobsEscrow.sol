// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ITapeOut.sol";

/// @title ChipJobsEscrow — circuit-design bounty escrow for TapeOut / X Layer
/// @notice A poster locks a native-token (OKB) reward for a small digital-circuit
///         design task. A designer tapes out a circuit on an existing TapeOut
///         processor and submits (processor index, circuit #ID). The contract
///         verifies on-chain that the circuit exists and is owned by the
///         submitter, then releases the reward automatically:
///         95% to the designer, 5% platform fee. Unclaimed bounties are
///         refundable in full after the deadline; the poster may also cancel
///         while the bounty is open.
/// @dev    Verification is exactly the TapeOut identity check (SPEC §5):
///         factory.cpuAt(cpuIndex) -> processor contract (reverts if the index
///         is out of range), factory.isCPU(processor), then
///         processor.ownerOf(circuitId) == submitter (reverts if #ID missing).
contract ChipJobsEscrow {
    uint256 public constant FEE_BPS = 500; // 5% settlement fee
    uint256 public constant BPS = 10_000;

    ITapeOutFactory public immutable factory;
    address public immutable feeRecipient;

    enum Status { Open, Filled, Refunded, Cancelled }

    struct Bounty {
        address poster;
        uint256 reward;      // wei locked in this contract
        uint64 deadline;     // unix seconds; claims must land before this
        bytes32 specHash;    // hash of the off-chain task specification document
        uint256 cpuIndex;    // required processor index (ignored when anyCpu)
        bool anyCpu;         // true = any TapeOut processor may be used
        Status status;
        address solver;      // set when Filled
        uint256 solvedCpu;   // processor index of the accepted circuit
        uint256 circuitId;   // #ID of the accepted circuit
    }

    Bounty[] public bounties;

    event BountyPosted(uint256 indexed id, address indexed poster, uint256 reward, uint64 deadline, bytes32 specHash, uint256 cpuIndex, bool anyCpu);
    event BountyClaimed(uint256 indexed id, address indexed solver, uint256 cpuIndex, uint256 circuitId, uint256 payout, uint256 fee);
    event BountyRefunded(uint256 indexed id, address indexed poster, uint256 amount);
    event BountyCancelled(uint256 indexed id, address indexed poster, uint256 amount);

    bool private _locked;
    modifier nonReentrant() {
        require(!_locked, "reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address factory_, address feeRecipient_) {
        require(factory_ != address(0) && feeRecipient_ != address(0), "zero addr");
        factory = ITapeOutFactory(factory_);
        feeRecipient = feeRecipient_;
    }

    function bountyCount() external view returns (uint256) {
        return bounties.length;
    }

    function getBounty(uint256 id) external view returns (Bounty memory) {
        require(id < bounties.length, "no bounty");
        return bounties[id];
    }

    /// @notice Post a bounty, locking the reward (msg.value) in escrow.
    function postBounty(bytes32 specHash, uint64 deadline, uint256 cpuIndex, bool anyCpu)
        external
        payable
        returns (uint256 id)
    {
        require(msg.value > 0, "no reward");
        require(deadline > block.timestamp, "deadline passed");
        if (!anyCpu) {
            // The required processor must already exist on TapeOut.
            require(cpuIndex < factory.cpuCount(), "no such cpu");
        }
        id = bounties.length;
        bounties.push(Bounty({
            poster: msg.sender,
            reward: msg.value,
            deadline: deadline,
            specHash: specHash,
            cpuIndex: cpuIndex,
            anyCpu: anyCpu,
            status: Status.Open,
            solver: address(0),
            solvedCpu: 0,
            circuitId: 0
        }));
        emit BountyPosted(id, msg.sender, msg.value, deadline, specHash, cpuIndex, anyCpu);
    }

    /// @notice Pure verification helper: does circuit (cpuIndex, circuitId)
    ///         exist on TapeOut and belong to `owner`? Never reverts.
    function verifyCircuit(uint256 cpuIndex, uint256 circuitId, address owner)
        public
        view
        returns (bool ok, address cpu)
    {
        if (cpuIndex >= factory.cpuCount()) return (false, address(0));
        cpu = factory.cpuAt(cpuIndex);
        if (!factory.isCPU(cpu)) return (false, cpu);
        try ICircuitCPU(cpu).ownerOf(circuitId) returns (address holder) {
            return (holder == owner, cpu);
        } catch {
            return (false, cpu);
        }
    }

    /// @notice Submit a taped-out circuit and claim the bounty in one call.
    ///         Pays out immediately when the on-chain check passes.
    function submitAndClaim(uint256 id, uint256 cpuIndex, uint256 circuitId) external nonReentrant {
        require(id < bounties.length, "no bounty");
        Bounty storage b = bounties[id];
        require(b.status == Status.Open, "not open");
        require(block.timestamp < b.deadline, "expired");
        if (!b.anyCpu) require(cpuIndex == b.cpuIndex, "wrong cpu");

        (bool ok, ) = verifyCircuit(cpuIndex, circuitId, msg.sender);
        require(ok, "circuit check failed");

        uint256 fee = (b.reward * FEE_BPS) / BPS;
        uint256 payout = b.reward - fee;

        b.status = Status.Filled;
        b.solver = msg.sender;
        b.solvedCpu = cpuIndex;
        b.circuitId = circuitId;

        emit BountyClaimed(id, msg.sender, cpuIndex, circuitId, payout, fee);
        _pay(msg.sender, payout);
        if (fee > 0) _pay(feeRecipient, fee);
    }

    /// @notice After the deadline anyone may trigger the full refund to the poster.
    function refundExpired(uint256 id) external nonReentrant {
        require(id < bounties.length, "no bounty");
        Bounty storage b = bounties[id];
        require(b.status == Status.Open, "not open");
        require(block.timestamp >= b.deadline, "not expired");
        b.status = Status.Refunded;
        emit BountyRefunded(id, b.poster, b.reward);
        _pay(b.poster, b.reward);
    }

    /// @notice The poster may cancel an open bounty at any time (full refund).
    function cancel(uint256 id) external nonReentrant {
        require(id < bounties.length, "no bounty");
        Bounty storage b = bounties[id];
        require(b.status == Status.Open, "not open");
        require(msg.sender == b.poster, "not poster");
        b.status = Status.Cancelled;
        emit BountyCancelled(id, b.poster, b.reward);
        _pay(b.poster, b.reward);
    }

    function _pay(address to, uint256 amount) internal {
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "pay failed");
    }
}
