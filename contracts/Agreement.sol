pragma solidity 0.4.23;

import "./AgreementManager.sol";


contract Agreement {
    enum Status { New, Running }

    address[] private participants;
    mapping(address => bool) private participantsSet;

    Status private currentStatus;

    uint private creationBlock;
    uint private creationTimestamp;
    AgreementManager private agreementManager;

    function Agreement(address creator) public {
        agreementManager = AgreementManager(msg.sender);

        participantsSet[creator] = true;
        participants.push(creator);

        creationBlock = block.number;
        creationTimestamp = block.timestamp;
        currentStatus = Status.New;
    }

    function join() public {
        if (!participantsSet[msg.sender]) {
            participantsSet[msg.sender] = true;
            participants.push(msg.sender);
        }
    }

    function accept(address suplicant) public {
        currentStatus = Status.Running;
    }

    function getParticipants() public view returns(address[64]) {
        address[64] memory page;
        for (uint i = 0; i < participants.length && i < 64; i++) {
            page[i] = participants[i];
        }
        return page;
    }

    function getCreationBlock() public view returns(uint) {
        return creationBlock;
    }

    function getCreationTimestamp() public view returns(uint) {
        return creationTimestamp;
    }

    function getStatus() public view returns(Status) {
        return currentStatus;
    }

    function remove() public {
        require(msg.sender == participants[0]);
        agreementManager.remove();
        selfdestruct(address(agreementManager));
    }

}
