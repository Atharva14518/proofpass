// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ProofPass Rescue
/// @notice An auditable native-MON escrow for food-rescue transport reimbursements.
/// @dev Wallet attestations preserve who confirmed each stage; they do not prove physical delivery or food safety.
contract ProofPassRescue is AccessControlDefaultAdminRules, ReentrancyGuard {
    bytes32 public constant CANTEEN_ROLE = keccak256("CANTEEN_ROLE");
    bytes32 public constant NGO_ROLE = keccak256("NGO_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");
    uint256 public constant MAX_BATCH_CREATE = 25;
    uint64 public constant DISPUTE_TIMEOUT = 14 days;

    enum Status { UNKNOWN, CREATED, FUNDED, PICKED_UP, RECEIVED, SETTLED, DISPUTED, CANCELLED, REFUNDED }

    struct DeliveryInput {
        bytes32 id;
        address volunteer;
        address receiver;
        uint64 declaredQuantity;
        uint64 pickupDeadline;
        uint64 deliveryDeadline;
        uint128 reimbursement;
        bytes32 publicDescriptionHash;
    }

    struct Delivery {
        bytes32 id;
        address canteen;
        address volunteer;
        address receiver;
        address sponsor;
        uint64 declaredQuantity;
        uint64 receivedQuantity;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 pickedUpAt;
        uint64 receivedAt;
        uint64 resolvedAt;
        uint64 pickupDeadline;
        uint64 deliveryDeadline;
        uint128 reimbursement;
        uint128 escrow;
        Status status;
        bytes32 publicDescriptionHash;
        bytes32 discrepancyHash;
    }

    mapping(bytes32 => Delivery) private deliveries;
    mapping(address => uint256) public withdrawable;
    uint256 public totalEscrowLiability;
    uint256 public totalWithdrawalLiability;

    error ZeroAddress();
    error InvalidTerms();
    error DuplicateDelivery(bytes32 id);
    error UnknownDelivery(bytes32 id);
    error InvalidState(Status expected, Status actual);
    error Unauthorized();
    error IncorrectFunding(uint256 expected, uint256 received);
    error DeadlineNotReached();
    error DeadlinePassed();
    error BatchTooLarge();
    error TransferFailed();
    error LiabilityInvariant();

    event DeliveryCreated(bytes32 indexed id, address indexed canteen, address indexed volunteer, address receiver, uint64 quantity, uint128 reimbursement);
    event DeliveryFunded(bytes32 indexed id, address indexed sponsor, uint256 amount);
    event PickupConfirmed(bytes32 indexed id, address indexed volunteer, uint64 timestamp);
    event ReceiptConfirmed(bytes32 indexed id, address indexed receiver, uint64 declaredQuantity, uint64 receivedQuantity, bytes32 discrepancyHash);
    event DeliveryDisputed(bytes32 indexed id, uint64 declaredQuantity, uint64 receivedQuantity);
    event DeliverySettled(bytes32 indexed id, address indexed volunteer, uint256 amount);
    event DeliveryCancelled(bytes32 indexed id, address indexed actor);
    event DeliveryRefunded(bytes32 indexed id, address indexed sponsor, uint256 amount);
    event DisputeResolved(bytes32 indexed id, uint256 volunteerCredit, uint256 sponsorRefund, address indexed resolver);
    event Withdrawal(address indexed account, uint256 amount);

    constructor(address initialAdmin) AccessControlDefaultAdminRules(1 days, initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();
        _grantRole(RESOLVER_ROLE, initialAdmin);
    }

    function createDelivery(DeliveryInput calldata input) external onlyRole(CANTEEN_ROLE) {
        _create(input);
    }

    function createDeliveries(DeliveryInput[] calldata inputs) external onlyRole(CANTEEN_ROLE) {
        if (inputs.length == 0 || inputs.length > MAX_BATCH_CREATE) revert BatchTooLarge();
        for (uint256 i; i < inputs.length; ++i) _create(inputs[i]);
    }

    function _create(DeliveryInput calldata input) private {
        if (input.id == bytes32(0) || input.volunteer == address(0) || input.receiver == address(0)) revert ZeroAddress();
        if (deliveries[input.id].status != Status.UNKNOWN) revert DuplicateDelivery(input.id);
        if (msg.sender == input.volunteer || msg.sender == input.receiver || input.volunteer == input.receiver) revert InvalidTerms();
        if (input.declaredQuantity == 0 || input.reimbursement == 0 || input.pickupDeadline <= block.timestamp || input.deliveryDeadline <= input.pickupDeadline) revert InvalidTerms();

        deliveries[input.id] = Delivery({
            id: input.id, canteen: msg.sender, volunteer: input.volunteer, receiver: input.receiver, sponsor: address(0),
            declaredQuantity: input.declaredQuantity, receivedQuantity: 0, createdAt: uint64(block.timestamp), fundedAt: 0,
            pickedUpAt: 0, receivedAt: 0, resolvedAt: 0, pickupDeadline: input.pickupDeadline,
            deliveryDeadline: input.deliveryDeadline, reimbursement: input.reimbursement, escrow: 0,
            status: Status.CREATED, publicDescriptionHash: input.publicDescriptionHash, discrepancyHash: bytes32(0)
        });
        emit DeliveryCreated(input.id, msg.sender, input.volunteer, input.receiver, input.declaredQuantity, input.reimbursement);
    }

    function fund(bytes32 id) external payable {
        Delivery storage d = _delivery(id);
        if (d.status != Status.CREATED) revert InvalidState(Status.CREATED, d.status);
        if (msg.value != d.reimbursement) revert IncorrectFunding(d.reimbursement, msg.value);
        d.sponsor = msg.sender;
        d.escrow = uint128(msg.value);
        d.fundedAt = uint64(block.timestamp);
        d.status = Status.FUNDED;
        totalEscrowLiability += msg.value;
        _assertSolvent();
        emit DeliveryFunded(id, msg.sender, msg.value);
    }

    function confirmPickup(bytes32 id) external {
        Delivery storage d = _delivery(id);
        if (d.status != Status.FUNDED) revert InvalidState(Status.FUNDED, d.status);
        if (msg.sender != d.volunteer) revert Unauthorized();
        if (block.timestamp > d.pickupDeadline) revert DeadlinePassed();
        d.pickedUpAt = uint64(block.timestamp);
        d.status = Status.PICKED_UP;
        emit PickupConfirmed(id, msg.sender, uint64(block.timestamp));
    }

    function confirmReceipt(bytes32 id, uint64 quantity, bytes32 discrepancyHash) external {
        Delivery storage d = _delivery(id);
        if (d.status != Status.PICKED_UP) revert InvalidState(Status.PICKED_UP, d.status);
        if (msg.sender != d.receiver || !hasRole(NGO_ROLE, msg.sender)) revert Unauthorized();
        if (quantity == 0) revert InvalidTerms();
        d.receivedQuantity = quantity;
        d.receivedAt = uint64(block.timestamp);
        d.discrepancyHash = discrepancyHash;
        emit ReceiptConfirmed(id, msg.sender, d.declaredQuantity, quantity, discrepancyHash);
        if (quantity == d.declaredQuantity) {
            d.status = Status.RECEIVED;
        } else {
            d.status = Status.DISPUTED;
            emit DeliveryDisputed(id, d.declaredQuantity, quantity);
        }
    }

    function settle(bytes32 id) external {
        Delivery storage d = _delivery(id);
        if (d.status != Status.RECEIVED) revert InvalidState(Status.RECEIVED, d.status);
        _settle(d);
    }

    function _settle(Delivery storage d) private {
        uint256 amount = d.escrow;
        d.escrow = 0;
        d.status = Status.SETTLED;
        totalEscrowLiability -= amount;
        withdrawable[d.volunteer] += amount;
        totalWithdrawalLiability += amount;
        _assertSolvent();
        emit DeliverySettled(d.id, d.volunteer, amount);
    }

    function cancelUnfunded(bytes32 id) external {
        Delivery storage d = _delivery(id);
        if (d.status != Status.CREATED) revert InvalidState(Status.CREATED, d.status);
        if (msg.sender != d.canteen && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized();
        d.status = Status.CANCELLED;
        emit DeliveryCancelled(id, msg.sender);
    }

    function refundUncollected(bytes32 id) external {
        Delivery storage d = _delivery(id);
        if (d.status != Status.FUNDED) revert InvalidState(Status.FUNDED, d.status);
        if (block.timestamp <= d.pickupDeadline) revert DeadlineNotReached();
        if (msg.sender != d.sponsor && !hasRole(RESOLVER_ROLE, msg.sender)) revert Unauthorized();
        uint256 amount = d.escrow;
        d.escrow = 0;
        d.status = Status.REFUNDED;
        totalEscrowLiability -= amount;
        withdrawable[d.sponsor] += amount;
        totalWithdrawalLiability += amount;
        _assertSolvent();
        emit DeliveryRefunded(id, d.sponsor, amount);
    }

    /// @notice Resolve a mismatch, or a picked-up delivery with no receipt after its delivery deadline.
    function resolve(bytes32 id, uint128 volunteerCredit) external onlyRole(RESOLVER_ROLE) {
        Delivery storage d = _delivery(id);
        bool missingReceipt = d.status == Status.PICKED_UP && block.timestamp > d.deliveryDeadline;
        if (d.status != Status.DISPUTED && !missingReceipt) revert Unauthorized();
        if (volunteerCredit > d.escrow) revert InvalidTerms();
        uint256 amount = d.escrow;
        uint256 sponsorRefund = amount - volunteerCredit;
        d.escrow = 0;
        d.resolvedAt = uint64(block.timestamp);
        d.status = Status.SETTLED;
        totalEscrowLiability -= amount;
        if (volunteerCredit != 0) {
            withdrawable[d.volunteer] += volunteerCredit;
            totalWithdrawalLiability += volunteerCredit;
        }
        if (sponsorRefund != 0) {
            withdrawable[d.sponsor] += sponsorRefund;
            totalWithdrawalLiability += sponsorRefund;
        }
        _assertSolvent();
        emit DisputeResolved(id, volunteerCredit, sponsorRefund, msg.sender);
    }

    /// @notice Fallback after a resolver has had 14 days: split proportionally by confirmed quantity, capped at the declared quantity.
    function resolveTimedOutDispute(bytes32 id) external {
        Delivery storage d = _delivery(id);
        if (d.status != Status.DISPUTED) revert InvalidState(Status.DISPUTED, d.status);
        if (block.timestamp <= d.receivedAt + DISPUTE_TIMEOUT) revert DeadlineNotReached();
        uint256 amount = d.escrow;
        uint256 creditedQuantity = d.receivedQuantity > d.declaredQuantity ? d.declaredQuantity : d.receivedQuantity;
        uint128 volunteerCredit = uint128((amount * creditedQuantity) / d.declaredQuantity);
        uint256 sponsorRefund = amount - volunteerCredit;
        d.escrow = 0;
        d.resolvedAt = uint64(block.timestamp);
        d.status = Status.SETTLED;
        totalEscrowLiability -= amount;
        withdrawable[d.volunteer] += volunteerCredit;
        withdrawable[d.sponsor] += sponsorRefund;
        totalWithdrawalLiability += amount;
        _assertSolvent();
        emit DisputeResolved(id, volunteerCredit, sponsorRefund, msg.sender);
    }

    function withdraw() external nonReentrant {
        uint256 amount = withdrawable[msg.sender];
        if (amount == 0) revert InvalidTerms();
        withdrawable[msg.sender] = 0;
        totalWithdrawalLiability -= amount;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        _assertSolvent();
        emit Withdrawal(msg.sender, amount);
    }

    function getDelivery(bytes32 id) external view returns (Delivery memory) { return _delivery(id); }
    function exists(bytes32 id) external view returns (bool) { return deliveries[id].status != Status.UNKNOWN; }
    function liabilities() external view returns (uint256 escrow, uint256 withdrawals, uint256 balance) {
        return (totalEscrowLiability, totalWithdrawalLiability, address(this).balance);
    }
    function _delivery(bytes32 id) private view returns (Delivery storage d) {
        d = deliveries[id];
        if (d.status == Status.UNKNOWN) revert UnknownDelivery(id);
    }
    function _assertSolvent() private view {
        if (address(this).balance < totalEscrowLiability + totalWithdrawalLiability) revert LiabilityInvariant();
    }
}
