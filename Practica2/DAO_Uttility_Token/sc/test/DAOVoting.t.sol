// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MinimalForwarder.sol";
import "../src/DAOVoting.sol";

contract DAOVotingTest is Test {
    MinimalForwarder forwarder;
    DAOVoting dao;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");
    address recipient = makeAddr("recipient");

    function setUp() public {
        // Deploy forwarder
        forwarder = new MinimalForwarder();

        // Deploy DAO
        dao = new DAOVoting(address(forwarder));

        // Fund users
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(charlie, 100 ether);
    }

    // ============ Fund DAO Tests ============

    function test_FundDAO() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        assertEq(dao.getUserBalance(alice), 10 ether);
        assertEq(dao.totalDAOBalance(), 10 ether);
    }

    function test_MultipleFunds() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        vm.prank(bob);
        dao.fundDAO{value: 5 ether}();

        assertEq(dao.getUserBalance(alice), 10 ether);
        assertEq(dao.getUserBalance(bob), 5 ether);
        assertEq(dao.totalDAOBalance(), 15 ether);
    }

    function test_FundDAORejectZero() public {
        vm.prank(alice);
        vm.expectRevert("Must send ETH");
        dao.fundDAO{value: 0}();
    }

    // ============ Proposal Creation Tests ============

    function test_CreateProposal() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;

        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.id, 1);
        assertEq(proposal.recipient, recipient);
        assertEq(proposal.amount, 5 ether);
        assertEq(proposal.deadline, deadline);
        assertEq(proposal.votesFor, 0);
    }

    function test_CreateProposalRequires10Percent() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        vm.prank(bob);
        dao.fundDAO{value: 5 ether}();

        // Bob has 5/15 = 33% of balance, should be able to create
        uint256 deadline = block.timestamp + 3 days;
        vm.prank(bob);
        dao.createProposal(recipient, 2 ether, deadline);

        assertEq(dao.getProposalCount(), 1);
    }

    function test_CreateProposalFailsIfInsufficientBalance() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        vm.prank(bob);
        dao.fundDAO{value: 1 ether}();

        // Bob has 1/11 = 9%, needs 10%
        uint256 deadline = block.timestamp + 3 days;
        vm.prank(bob);
        vm.expectRevert("Insufficient balance to create proposal");
        dao.createProposal(recipient, 2 ether, deadline);
    }

    function test_CreateProposalRejectsZeroAmount() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;

        vm.prank(alice);
        vm.expectRevert("Amount must be > 0");
        dao.createProposal(recipient, 0, deadline);
    }

    function test_CreateProposalRejectsPastDeadline() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp - 1;

        vm.prank(alice);
        vm.expectRevert("Deadline in past");
        dao.createProposal(recipient, 5 ether, deadline);
    }

    // ============ Voting Tests ============

    function test_Vote() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.FOR);

        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 1);

        (bool voted, DAOVoting.VoteType voteType) = dao.getUserVote(1, alice);
        assertTrue(voted);
        assertEq(uint256(voteType), uint256(DAOVoting.VoteType.FOR));
    }

    function test_CannotVoteTwice() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.FOR);

        vm.prank(alice);
        vm.expectRevert("Already voted");
        dao.vote(1, DAOVoting.VoteType.AGAINST);
    }

    function test_ChangeVote() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.FOR);

        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 1);
        assertEq(proposal.votesAgainst, 0);

        vm.prank(alice);
        dao.changeVote(1, DAOVoting.VoteType.AGAINST);

        proposal = dao.getProposal(1);
        assertEq(proposal.votesFor, 0);
        assertEq(proposal.votesAgainst, 1);
    }

    function test_CannotVoteAfterDeadline() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 1 seconds;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.warp(block.timestamp + 2 seconds);

        vm.prank(alice);
        vm.expectRevert("Voting period has ended");
        dao.vote(1, DAOVoting.VoteType.FOR);
    }

    function test_CannotVoteWithoutBalance() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(bob);
        vm.expectRevert("No voting power");
        dao.vote(1, DAOVoting.VoteType.FOR);
    }

    // ============ Proposal Execution Tests ============

    function test_ExecuteProposal() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 1 seconds;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.FOR);

        // Move past deadline and security period
        vm.warp(block.timestamp + deadline + 2 days + 1 seconds);

        dao.executeProposal(1);

        DAOVoting.Proposal memory proposal = dao.getProposal(1);
        assertTrue(proposal.executed);
        assertEq(dao.totalDAOBalance(), 5 ether);
    }

    function test_ExecuteProposalFailsBeforeDeadline() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 3 days;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(alice);
        vm.expectRevert("Voting period still active");
        dao.executeProposal(1);
    }

    function test_ExecuteProposalFailsIfNotApproved() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        vm.prank(bob);
        dao.fundDAO{value: 5 ether}();

        uint256 deadline = block.timestamp + 1 seconds;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.AGAINST);

        vm.prank(bob);
        dao.vote(1, DAOVoting.VoteType.FOR);

        vm.warp(block.timestamp + deadline + 2 days + 1 seconds);

        vm.expectRevert("Proposal not approved");
        dao.executeProposal(1);
    }

    function test_ProposalStateChanges() public {
        vm.prank(alice);
        dao.fundDAO{value: 10 ether}();

        uint256 deadline = block.timestamp + 1 seconds;
        vm.prank(alice);
        dao.createProposal(recipient, 5 ether, deadline);

        // Initial state should be ACTIVE
        assertEq(
            uint256(dao.getProposalState(1)),
            uint256(DAOVoting.ProposalState.ACTIVE)
        );

        vm.prank(alice);
        dao.vote(1, DAOVoting.VoteType.FOR);

        // Move past deadline
        vm.warp(block.timestamp + deadline + 1);

        // Should be APPROVED
        assertEq(
            uint256(dao.getProposalState(1)),
            uint256(DAOVoting.ProposalState.APPROVED)
        );
    }
}
