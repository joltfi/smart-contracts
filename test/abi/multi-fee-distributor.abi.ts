export const multiFeeDistributionAbi = [
  // State-changing functions
  'function setMinters(address[] minters) external',
  'function setIncentivesController(address _controller) external',
  'function addReward(address _rewardsToken) external',
  'function getReward(address[] _rewardsTokens) external',
  'function stake(uint256 amount, bool lock) external',
  'function mint(address user, uint256 amount, bool withPenalty) external',
  'function withdraw(uint256 amount) external',
  'function exit(bool claimRewards) external',
  'function withdrawExpiredLocks() external',
  'function recoverERC20(address tokenAddress, uint256 tokenAmount) external',

  // View functions
  'function lockedSupply() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function rewardPerToken(address _rewardsToken) external view returns (uint256)',
  'function getRewardForDuration(address _rewardsToken) external view returns (uint256)',
  'function claimableRewards(address account) external view returns (tuple(address token, uint256 amount)[])',
  'function totalBalance(address user) external view returns (uint256)',
  'function unlockedBalance(address user) external view returns (uint256)',
  'function earnedBalances(address user) external view returns (uint256 total, tuple(uint256 amount, uint256 unlockTime)[] earningsData)',
  'function lockedBalances(address user) external view returns (uint256 total, uint256 unlockable, uint256 locked, tuple(uint256 amount, uint256 unlockTime)[] lockData)',
  'function withdrawableBalance(address user) external view returns (uint256 amount, uint256 penaltyAmount)',
  'function lastTimeRewardApplicable(address _rewardsToken) external view returns (uint256)',

  // Events
  'event RewardAdded(uint256 reward)',
  'event Staked(address indexed user, uint256 amount, bool locked)',
  'event Withdrawn(address indexed user, uint256 receivedAmount, uint256 penaltyPaid)',
  'event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward)',
  'event RewardsDurationUpdated(address token, uint256 newDuration)',
  'event Recovered(address token, uint256 amount)',

  // Internal functions not part of public ABI but may be needed for contract interaction
  'function _updateReward(address account) internal',
  'function _notifyReward(address _rewardsToken, uint256 reward) internal',
  'function _getReward(address[] _rewardTokens) internal',
  'function _rewardPerToken(address _rewardsToken, uint256 _supply) internal view returns (uint256)',
  'function _earned(address _user, address _rewardsToken, uint256 _balance, uint256 _currentRewardPerToken) internal view returns (uint256)',
];
