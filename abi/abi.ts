export const ALL_ABI = [
  "function fetchPrice() external view returns (uint256)",
  "function getAssetPrice(address) external view returns (uint256)",
  "function fetchSource() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
];

export const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function transferFrom(address from, address to, uint256 value) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

export const OFT_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function transferFrom(address from, address to, uint256 value) external returns (bool)",
  "function sendFrom(address from, uint16 dstChainId, bytes32 toAddress, uint256 amount, address payable refundAddress, address zroPaymentAddress, bytes calldata adapterParams) external payable",
  "function estimateSendFee(uint16 dstChainId, bytes32 toAddress, uint256 amount, bool useZro, bytes calldata adapterParams) external view returns (uint256 nativeFee, uint256 zroFee)",
  "function circulatingSupply() external view returns (uint256)",
  "function minDstGasLookup(uint16 dstChainId, uint256 packetType) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event SendToChain(address indexed sender, uint16 indexed dstChainId, bytes32 indexed toAddress, uint256 amount)",
  "event ReceiveFromChain(uint16 indexed srcChainId, bytes32 indexed fromAddress, address indexed to, uint256 amount)",
];

export const MULTIFEE_ABI = [
  "function setMinters(address[]) external",
  "function setIncentivesController(address) external",
  "function addReward(address) external",
  "function rewardPerToken(address) external view returns (uint256)",
  "function getRewardForDuration(address) external view returns (uint256)",
  "function totalBalance(address) external view returns (uint256)",
  "function unlockedBalance(address) external view returns (uint256)",
  "function withdrawableBalance(address) public view returns (uint256,uint256)",
  "function rewardData(address) public view returns (uint256,uint256,uint256,uint256,uint256)",
  "function incentivesController() public view returns (address)",
  "function lockDuration() public view returns (uint256)",
  "function lockedSupply() public view returns (uint256)",
  "function mintersAreSet() public view returns (bool)",
  "function rewardsDuration() public view returns (uint256)",
  "function stakingToken() public view returns (address)",
  "function totalSupply() public view returns (uint256)",

  "function stake(uint256,bool) external",
  "function mint(address,uint256,bool) external",
  "function withdraw(uint256) public",
  "function getReward(address[]) public",
  "function exit(bool) external",
  "function withdrawExpiredLocks() external",
  "function _notifyReward(address,uint256) internal",
  "function recoverERC20(address,uint256) external",
  "function _updateReward(address) internal",

  "event RewardAdded(uint256)",
  "event Staked(address,uint256,bool)",
  "event Withdrawn(address,uint256,uint256)",
  "event RewardPaid(address,address,uint256)",
  "event RewardsDurationUpdated(address,uint256)",
  "event Recovered(address,uint256)",
];

export const CHEF_ABI = [
  "function registeredTokens(uint256) public view returns (address)",
  "function totalAllocPoint() public view returns (uint256)",
  "function rewardsPerSecond() public view returns (uint256)",
  "function rewardMinter() public view returns (address)",
  "function poolLength() public view returns (uint256)",
  "function poolInfo(address) public view returns (uint256)",
];

export const LENDINGPOOL_ABI = [
  "function withdrawReserved(address asset, address to) external",
];

export const ATOKEN_ABI = [
  "function withdrawReserves(uint256 amount) external returns (uint256)",
  ...ERC20_ABI,
];
