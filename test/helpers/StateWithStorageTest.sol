pragma solidity 0.4.24;

import "../../contracts/machine/AbstractState.sol";
import "../../contracts/utils/StorageClient.sol";

contract StateWithStorageTest is StorageClient, AbstractState {

    event Debug(uint start, uint length, uint at);

    function setBytes32(bytes32 val) public {
        StorageUtils.SPointer memory ptr = getStoragePointer(0x0);
        emit Debug(ptr._start,ptr._length, ptr._at);
        bytes32[] memory tmp = new bytes32[](1);
        tmp[0] = val;
        ptr.setSlots(tmp);
    }

    function getBytes32() public view returns(bytes32) {
        StorageUtils.SPointer memory ptr = getStoragePointer(0x0);
        return ptr.getSlots(1)[0];
    }

    function transition() public {
      bytes32[] memory reachable = getMachineReachableStates();
      setMachineNextState(reachable[0]);
    }

}
