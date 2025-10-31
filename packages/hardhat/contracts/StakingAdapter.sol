// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

contract StakingAdapter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPool public immutable pool;
    IERC20 public immutable usdc;

    mapping(address => uint256) public balances;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    error AmountZero();
    error InsufficientBalance();
    error InvalidAddress();

    constructor(address _pool, address _usdc) {
        if (_pool == address(0) || _usdc == address(0)) {
            revert InvalidAddress();
        }
        pool = IPool(_pool);
        usdc = IERC20(_usdc);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(pool), amount);
        pool.supply(address(usdc), amount, address(this), 0);
        balances[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        pool.withdraw(address(usdc), amount, msg.sender);
        emit Unstaked(msg.sender, amount);
    }

    function viewBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function totalStaked() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}