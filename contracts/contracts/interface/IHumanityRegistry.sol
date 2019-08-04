pragma solidity 0.5.7;
pragma experimental ABIEncoderV2;


contract IHumanityRegistry {
    function isHuman(address who) public view returns (bool);
}
