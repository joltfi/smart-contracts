// SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "../interfaces/IMultiFeeDistribution.sol";
import "../interfaces/IOnwardIncentivesController.sol";
import "../dependencies/openzeppelin/contracts/SafeERC20.sol";
import "../dependencies/openzeppelin/contracts/SafeMath.sol";
import "../dependencies/openzeppelin/contracts/Ownable.sol";

// based on the Sushi MasterChef
// https://github.com/sushiswap/sushiswap/blob/master/contracts/MasterChef.sol
interface IJoltOFT {
    function circulatingSupply() external view returns (uint256);

    function totalSupply() external view returns (uint256);
}

contract ChefIncentivesController is Ownable {
    using SafeMath for uint256;

    uint16 public apr; // APR in basis points (e.g., 500 = 5.00%)
    uint256 public rewardsPerSecond;
    IJoltOFT public oftToken;

    uint32 private constant SECONDS_IN_A_YEAR = 31_536_000; // 365 days
    uint16 private constant BASIS_POINTS_DIVISOR = 10_000; // For APR in basis points

    event RewardsPerSecondUpdated(uint256 newRewardsPerSecond);
    event APRUpdated(uint16 newAPR);

    // Info of each user.
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }
    // Info of each pool.
    struct PoolInfo {
        uint256 totalSupply;
        uint256 allocPoint; // How many allocation points assigned to this pool.
        uint256 lastRewardTime; // Last second that reward distribution occurs.
        uint256 accRewardPerShare; // Accumulated rewards per share, times 1e12. See below.
        IOnwardIncentivesController onwardIncentives;
    }
    // Info about token emissions for a given time period.
    struct EmissionPoint {
        uint128 startTimeOffset;
        uint128 rewardsPerSecond;
    }

    address public poolConfigurator;

    IMultiFeeDistribution public rewardMinter;
    uint256 public mintedTokens;

    // Info of each pool.
    address[] public registeredTokens;
    mapping(address => PoolInfo) public poolInfo;

    // token => user => Info of each user that stakes LP tokens.
    mapping(address => mapping(address => UserInfo)) public userInfo;
    // user => base claimable balance
    mapping(address => uint256) public userBaseClaimable;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when reward mining starts.
    uint256 public startTime;

    // account earning rewards => receiver of rewards for this account
    // if receiver is set to address(0), rewards are paid to the earner
    // this is used to aid 3rd party contract integrations
    mapping(address => address) public claimReceiver;

    event BalanceUpdated(
        address indexed token,
        address indexed user,
        uint256 balance,
        uint256 totalSupply
    );

    constructor(
        address _poolConfigurator,
        IMultiFeeDistribution _rewardMinter,
        address _oftToken,
        uint16 _initialAPR
    ) Ownable() {
        require(_oftToken != address(0), "Invalid OFT token address");
        require(_initialAPR <= BASIS_POINTS_DIVISOR, "APR exceeds 100%");

        oftToken = IJoltOFT(_oftToken);

        apr = _initialAPR;

        poolConfigurator = _poolConfigurator;
        rewardMinter = _rewardMinter;

        _updateRewardsPerSecond();
    }

    /**
     * @dev Public function to manually update the rewards per second.
     */
    function updateRewardsPerSecond() external onlyOwner {
        _updateRewardsPerSecond();
    }

    /**
     * @dev Updates the APR. Can only be called by the owner.
     * @param _newAPR New APR in basis points.
     */
    function setAPR(uint16 _newAPR) external onlyOwner {
        require(_newAPR <= BASIS_POINTS_DIVISOR, "APR exceeds 100%");
        apr = _newAPR;
        emit APRUpdated(apr);
        _massUpdatePools(); // Finalize rewards using the old APR
        _updateRewardsPerSecond();
    }

    /**
     * @dev Updates the rewards per second based on the current total supply of the OFT token and the APR.
     */
    function _updateRewardsPerSecond() internal {
        uint256 totalSupply = oftToken.totalSupply();
        if (block.timestamp > startTime.add(SECONDS_IN_A_YEAR)) {
            totalSupply = oftToken.circulatingSupply();
        }
        rewardsPerSecond = totalSupply.mul(apr).div(BASIS_POINTS_DIVISOR).div(
            SECONDS_IN_A_YEAR
        );

        emit RewardsPerSecondUpdated(rewardsPerSecond);
    }

    // Start the party
    function start() public onlyOwner {
        require(startTime == 0);
        startTime = block.timestamp;
    }

    // Add a new lp to the pool. Can only be called by the poolConfigurator.
    function addPool(address _token, uint256 _allocPoint) external {
        require(msg.sender == poolConfigurator);
        require(poolInfo[_token].lastRewardTime == 0);
        _massUpdatePools();

        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        registeredTokens.push(_token);
        poolInfo[_token] = PoolInfo({
            totalSupply: 0,
            allocPoint: _allocPoint,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0,
            onwardIncentives: IOnwardIncentivesController(0)
        });
    }

    // Update the given pool's allocation point. Can only be called by the owner.
    function batchUpdateAllocPoint(
        address[] calldata _tokens,
        uint256[] calldata _allocPoints
    ) public onlyOwner {
        require(_tokens.length == _allocPoints.length);
        _massUpdatePools();
        uint256 _totalAllocPoint = totalAllocPoint;
        for (uint256 i = 0; i < _tokens.length; i++) {
            PoolInfo storage pool = poolInfo[_tokens[i]];
            require(pool.lastRewardTime > 0);
            _totalAllocPoint = _totalAllocPoint.sub(pool.allocPoint).add(
                _allocPoints[i]
            );
            pool.allocPoint = _allocPoints[i];
        }
        totalAllocPoint = _totalAllocPoint;
    }

    function setRewardsPerSecond(uint256 _rewardsPerSecond) external onlyOwner {
        _massUpdatePools(); // Update all pools before changing the reward rate
        rewardsPerSecond = _rewardsPerSecond;
    }

    function setOnwardIncentives(
        address _token,
        IOnwardIncentivesController _incentives
    ) external onlyOwner {
        require(poolInfo[_token].lastRewardTime != 0);
        poolInfo[_token].onwardIncentives = _incentives;
    }

    function setClaimReceiver(address _user, address _receiver) external {
        require(msg.sender == _user || msg.sender == owner());
        claimReceiver[_user] = _receiver;
    }

    function poolLength() external view returns (uint256) {
        return registeredTokens.length;
    }

    function claimableReward(
        address _user,
        address[] calldata _tokens
    ) external view returns (uint256[] memory) {
        uint256[] memory claimable = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            PoolInfo storage pool = poolInfo[token];
            UserInfo storage user = userInfo[token][_user];
            uint256 accRewardPerShare = pool.accRewardPerShare;
            uint256 lpSupply = pool.totalSupply;
            if (block.timestamp > pool.lastRewardTime && lpSupply != 0) {
                uint256 duration = block.timestamp.sub(pool.lastRewardTime);
                uint256 reward = duration
                    .mul(rewardsPerSecond)
                    .mul(pool.allocPoint)
                    .div(totalAllocPoint);
                accRewardPerShare = accRewardPerShare.add(
                    reward.mul(1e12).div(lpSupply)
                );
            }
            claimable[i] = user.amount.mul(accRewardPerShare).div(1e12).sub(
                user.rewardDebt
            );
        }
        return claimable;
    }

    // Update reward variables for all pools
    function _massUpdatePools() internal {
        uint256 totalAP = totalAllocPoint;
        uint256 length = registeredTokens.length;
        for (uint256 i = 0; i < length; ++i) {
            _updatePool(poolInfo[registeredTokens[i]], totalAP);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function _updatePool(
        PoolInfo storage pool,
        uint256 _totalAllocPoint
    ) internal {
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        uint256 lpSupply = pool.totalSupply;
        if (lpSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        uint256 duration = block.timestamp.sub(pool.lastRewardTime);
        uint256 reward = duration
            .mul(rewardsPerSecond)
            .mul(pool.allocPoint)
            .div(_totalAllocPoint);
        pool.accRewardPerShare = pool.accRewardPerShare.add(
            reward.mul(1e12).div(lpSupply)
        );
        pool.lastRewardTime = block.timestamp;
    }

    function _mint(address _user, uint256 _amount) internal {
        uint256 minted = mintedTokens;

        if (_amount > 0) {
            mintedTokens = minted.add(_amount);
            address receiver = claimReceiver[_user];
            if (receiver == address(0)) receiver = _user;
            rewardMinter.mint(receiver, _amount, true);
            _updateRewardsPerSecond();
        }
    }

    function handleAction(
        address _user,
        uint256 _balance,
        uint256 _totalSupply
    ) external {
        PoolInfo storage pool = poolInfo[msg.sender];
        require(pool.lastRewardTime > 0);

        _updatePool(pool, totalAllocPoint);
        UserInfo storage user = userInfo[msg.sender][_user];
        uint256 amount = user.amount;
        uint256 accRewardPerShare = pool.accRewardPerShare;
        if (amount > 0) {
            uint256 pending = amount.mul(accRewardPerShare).div(1e12).sub(
                user.rewardDebt
            );
            if (pending > 0) {
                userBaseClaimable[_user] = userBaseClaimable[_user].add(
                    pending
                );
            }
        }
        user.amount = _balance;
        user.rewardDebt = _balance.mul(accRewardPerShare).div(1e12);
        pool.totalSupply = _totalSupply;
        if (pool.onwardIncentives != IOnwardIncentivesController(0)) {
            pool.onwardIncentives.handleAction(
                msg.sender,
                _user,
                _balance,
                _totalSupply
            );
        }
        emit BalanceUpdated(msg.sender, _user, _balance, _totalSupply);
    }

    // Claim pending rewards for one or more pools.
    // Rewards are not received directly, they are minted by the rewardMinter.
    function claim(address _user, address[] calldata _tokens) external {
        _massUpdatePools();
        uint256 pending = userBaseClaimable[_user];
        userBaseClaimable[_user] = 0;
        uint256 _totalAllocPoint = totalAllocPoint;
        for (uint i = 0; i < _tokens.length; i++) {
            PoolInfo storage pool = poolInfo[_tokens[i]];
            require(pool.lastRewardTime > 0);
            _updatePool(pool, _totalAllocPoint);
            UserInfo storage user = userInfo[_tokens[i]][_user];
            uint256 rewardDebt = user.amount.mul(pool.accRewardPerShare).div(
                1e12
            );
            pending = pending.add(rewardDebt.sub(user.rewardDebt));
            user.rewardDebt = rewardDebt;
        }
        _mint(_user, pending);
    }
}
