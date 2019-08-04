pragma solidity 0.5.7;
pragma experimental ABIEncoderV2;

import { IERC20 } from "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";
import { CompoundPool } from "compound-pooling/contracts/CompoundPool.sol";

import { IHumanityRegistry } from "./interface/IHumanityRegistry.sol";

/**
 * @title UniversalBasicIncome
 * @dev Dai that can be claimed by humans on the Human Registry.
 */
contract UniversalBasicIncome {
    using SafeMath for uint;

    IHumanityRegistry public registry;
    IERC20 public dai;
    CompoundPool public bank;

    uint public constant MONTHLY_INCOME = 1e18; // 1 Dai
    uint public constant INCOME_PER_SECOND = MONTHLY_INCOME / 30 days;

    mapping (address => uint) public claimTimes;

    constructor(IHumanityRegistry _registry, IERC20 _dai, CompoundPool _bank) public {
        registry = _registry;
        dai = _dai;
        bank = _bank;
    }

    function claim() public {
        require(registry.isHuman(msg.sender), "UniversalBasicIncome::claim: You must be on the Humanity registry to claim income");

        uint income;
        uint time = block.timestamp;

        // If claiming for the first time, send 1 month of UBI
        if (claimTimes[msg.sender] == 0) {
            income = MONTHLY_INCOME;
        } else {
            income = time.sub(claimTimes[msg.sender]).mul(INCOME_PER_SECOND);
        }

        uint balance = bank.excessDepositTokens();
        // If not enough Dai reserves, send the remaining balance
        uint actualIncome = balance < income ? balance : income;

        bank.withdrawInterest(msg.sender, actualIncome);
        claimTimes[msg.sender] = time;
    }

    function claimableBalance(address human) public returns (uint256) {
        if(!registry.isHuman(human)){
            return 0;
        }
        uint income;
        uint time = block.timestamp;

        // If claiming for the first time, send 1 month of UBI
        if (claimTimes[human] == 0) {
            income = MONTHLY_INCOME;
        } else {
            income = time.sub(claimTimes[human]).mul(INCOME_PER_SECOND);
        }

        uint balance = bank.excessDepositTokens();
        // If not enough Dai reserves, use the remaining amount
        return balance < income ? balance : income;

    }

}
