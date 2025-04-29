export const chefIncentivesControllerAbi = [
  // write
  'function claim(address _user, address[] _tokens) external',

  // View functions
  'function poolLength() external view returns (uint256)',
  'function claimableReward(address _user, address[] calldata _tokens) external view returns (uint256[] memory)',
  'function totalAllocPoint() external view returns (uint256)',
  'function registeredTokens(uint256 index) external view returns (address)',
  'function poolInfo(address _token) external view returns (uint256 totalSupply, uint256 allocPoint, uint256 lastRewardTime, uint256 accRewardPerShare, address onwardIncentives)',
  'function userInfo(address _token, address _user) external view returns (uint256 amount, uint256 rewardDebt)',
  'function rewardsPerSecond() external view returns (uint256 amount)',
  'function rewardMinter() external view returns (address)',
  'function userBaseClaimable(address) external view returns (uint256)',
  'function claimable(address) external view returns (uint256)',

  // Events
  'event BalanceUpdated(address indexed token, address indexed user, uint256 balance, uint256 totalSupply)',
];
