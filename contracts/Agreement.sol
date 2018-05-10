pragma solidity 0.4.23;

import "./AgreementManager.sol";


contract Agreement {
    enum Status { New, Done}

    address[] private participants;
    mapping(address => bool) private participantsSet;

    uint private creationBlock;
    uint private creationTimestamp;
    bool private doneFlag = false;
    AgreementManager private agreementManager;

    function Agreement(address creator) public {
        agreementManager = AgreementManager(msg.sender);

        participantsSet[creator] = true;
        participants.push(creator);

        creationBlock = block.number;
        creationTimestamp = block.timestamp;
    }

    function join() public {
        if (!participantsSet[msg.sender]) {
            participantsSet[msg.sender] = true;
            participants.push(msg.sender);
        }
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

    function setDoneFlag(bool flag) private
    {
        doneFlag = flag;
    }

    function getStatus() public view returns(Status) {
        if(doneFlag == false) {
            return Status.New;
        }
        else return Status.Done;   
    }

    function conclude() public
    {
        require(participantsSet[msg.sender],"Address isn't part of agreement");
        setDoneFlag(true);
    }

    function remove() public {
        require(msg.sender == participants[0]);
        agreementManager.remove();
        selfdestruct(address(agreementManager));
    }



}
