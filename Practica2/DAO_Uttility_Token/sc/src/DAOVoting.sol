// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title DAOVoting
 * @dev DAO contract with gasless voting using EIP-2771
 * Allows proposal creation, voting, and execution with meta-transactions
 */
contract DAOVoting is ERC2771Context, Ownable {
    // ============ Types ============

    enum VoteType {
        FOR,
        AGAINST,
        ABSTAIN
    }

    enum ProposalState {
        PENDING,
        ACTIVE,
        APPROVED,
        REJECTED,
        EXECUTED
    }

    struct Proposal {
        uint256 id;
        string title;       // <--- NUEVO
        string description; // <--- NUEVO
        address recipient;
        uint256 amount;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        bool executed;
        uint256 executionTime;
    }

    struct Vote {
        bool voted;
        VoteType voteType;
    }

    // ============ State Variables ============

    uint256 private _proposalCounter;
    uint256 public totalDAOBalance;
    uint256 private constant SECURITY_PERIOD = 2 days;
    uint256 private constant MIN_CREATION_PERCENTAGE = 10; // 10%

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(address => uint256) public userBalances;

    // ============ Events ============

    event DAOFunded(address indexed funder, uint256 amount);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string title, // <--- NUEVO EN EVENTO
        address recipient,
        uint256 amount,
        uint256 deadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteType voteType
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );

    // ============ Modifiers ============

    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= _proposalCounter, "Invalid proposal ID");
        _;
    }

    modifier canVote(uint256 proposalId) {
        require(
            block.timestamp <= proposals[proposalId].deadline,
            "Voting period has ended"
        );
        require(!votes[proposalId][_msgSender()].voted, "Already voted");
        _;
    }

    modifier canExecute(uint256 proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");
        require(
            block.timestamp > proposal.deadline,
            "Voting period still active"
        );
        require(
            block.timestamp >= proposal.deadline + SECURITY_PERIOD,
            "Security period not passed"
        );
        require(
            proposal.votesFor > proposal.votesAgainst,
            "Proposal not approved"
        );
        _;
    }

    // ============ Constructor ============

    constructor(address trustedForwarder)
        ERC2771Context(trustedForwarder)
        Ownable(msg.sender)
    {}

    // ============ External Functions ============

    /**
     * @dev Fund the DAO with ETH
     */
    function fundDAO() external payable {
        require(msg.value > 0, "Must send ETH");
        userBalances[_msgSender()] += msg.value;
        totalDAOBalance += msg.value;
        emit DAOFunded(_msgSender(), msg.value);
    }

    /**
     * @dev Create a new proposal
     * @param title Title of the proposal
     * @param description Description of the proposal
     * @param recipient Address to receive funds
     * @param amount Amount of ETH to transfer
     * @param deadline Timestamp when voting ends
     */
    function createProposal(
        string memory title,       // <--- NUEVO
        string memory description, // <--- NUEVO
        address recipient,
        uint256 amount,
        uint256 deadline
    ) external {
        require(bytes(title).length > 0, "Title required");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(amount <= totalDAOBalance, "Insufficient DAO balance");
        require(deadline > block.timestamp, "Deadline in past");

        // Check if user has at least 10% of DAO balance
        uint256 requiredBalance = (totalDAOBalance * MIN_CREATION_PERCENTAGE) /
            100;
        require(
            userBalances[_msgSender()] >= requiredBalance,
            "Insufficient balance to create proposal"
        );

        _proposalCounter++;
        uint256 proposalId = _proposalCounter;

        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,             // <--- NUEVO
            description: description, // <--- NUEVO
            recipient: recipient,
            amount: amount,
            deadline: deadline,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            executed: false,
            executionTime: 0
        });

        emit ProposalCreated(
            proposalId,
            _msgSender(),
            title,
            recipient,
            amount,
            deadline
        );
    }

    /**
     * @dev Cast a vote on a proposal
     */
    function vote(uint256 proposalId, VoteType voteType)
        external
        proposalExists(proposalId)
        canVote(proposalId)
    {
        require(userBalances[_msgSender()] > 0, "No voting power");

        Proposal storage proposal = proposals[proposalId];
        Vote storage userVote = votes[proposalId][_msgSender()];

        userVote.voted = true;
        userVote.voteType = voteType;

        if (voteType == VoteType.FOR) {
            proposal.votesFor++;
        } else if (voteType == VoteType.AGAINST) {
            proposal.votesAgainst++;
        } else {
            proposal.votesAbstain++;
        }

        emit VoteCast(proposalId, _msgSender(), voteType);
    }

    /**
     * @dev Change vote on a proposal before deadline
     */
    function changeVote(uint256 proposalId, VoteType voteType)
        external
        proposalExists(proposalId)
    {
        require(
            block.timestamp <= proposals[proposalId].deadline,
            "Voting period ended"
        );
        require(
            votes[proposalId][_msgSender()].voted,
            "Haven't voted yet"
        );

        Proposal storage proposal = proposals[proposalId];
        Vote storage userVote = votes[proposalId][_msgSender()];
        VoteType oldVote = userVote.voteType;

        // Remove old vote
        if (oldVote == VoteType.FOR) {
            proposal.votesFor--;
        } else if (oldVote == VoteType.AGAINST) {
            proposal.votesAgainst--;
        } else {
            proposal.votesAbstain--;
        }

        // Add new vote
        userVote.voteType = voteType;
        if (voteType == VoteType.FOR) {
            proposal.votesFor++;
        } else if (voteType == VoteType.AGAINST) {
            proposal.votesAgainst++;
        } else {
            proposal.votesAbstain++;
        }

        emit VoteCast(proposalId, _msgSender(), voteType);
    }

    /**
     * @dev Execute an approved proposal
     */
    function executeProposal(uint256 proposalId)
        external
        proposalExists(proposalId)
        canExecute(proposalId)
    {
        Proposal storage proposal = proposals[proposalId];

        proposal.executed = true;
        proposal.executionTime = block.timestamp;
        totalDAOBalance -= proposal.amount;

        (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
        require(success, "Transfer failed");

        emit ProposalExecuted(proposalId, proposal.recipient, proposal.amount);
    }

    // ============ View Functions ============

    function getProposal(uint256 proposalId)
        external
        view
        proposalExists(proposalId)
        returns (Proposal memory)
    {
        return proposals[proposalId];
    }

    function getProposalState(uint256 proposalId)
        external
        view
        proposalExists(proposalId)
        returns (ProposalState)
    {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) {
            return ProposalState.EXECUTED;
        }

        if (block.timestamp <= proposal.deadline) {
            return ProposalState.ACTIVE;
        }

        if (proposal.votesFor > proposal.votesAgainst) {
            return ProposalState.APPROVED;
        }

        return ProposalState.REJECTED;
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    function getProposalCount() external view returns (uint256) {
        return _proposalCounter;
    }

    function getUserVote(uint256 proposalId, address user)
        external
        view
        returns (bool voted, VoteType voteType)
    {
        Vote storage userVote = votes[proposalId][user];
        return (userVote.voted, userVote.voteType);
    }

    // ============ Internal Functions ============

    function _msgSender()
        internal
        view
        override(ERC2771Context, Context)
        returns (address)
    {
        return super._msgSender();
    }

    function _msgData()
        internal
        view
        override(ERC2771Context, Context)
        returns (bytes calldata)
    {
        return super._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        override(ERC2771Context, Context)
        returns (uint256)
    {
        return super._contextSuffixLength();
    }
}