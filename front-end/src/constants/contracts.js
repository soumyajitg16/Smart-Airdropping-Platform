import { parseAbi } from 'viem';

const LOCAL_FACTORY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const LOCAL_PUSH_AIRDROP_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const LOCAL_TEST_TOKEN_ADDRESS = '0x8464135c8F25Da09e49BC8782676a84730C318bC';

export const FACTORY_ADDRESS =
  import.meta.env.VITE_FACTORY_ADDRESS || LOCAL_FACTORY_ADDRESS;
export const PUSH_AIRDROP_ADDRESS =
  import.meta.env.VITE_PUSH_AIRDROP_ADDRESS || LOCAL_PUSH_AIRDROP_ADDRESS;
export const TEST_TOKEN_ADDRESS =
  import.meta.env.VITE_TEST_TOKEN_ADDRESS || LOCAL_TEST_TOKEN_ADDRESS;

export const ERC20_ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)'
]);

export const FACTORY_ABI = parseAbi([
  'function createAndFundAirdrop(address token, bytes32 merkleRoot, uint256 totalAllocation, uint256 durationInSeconds) external returns (address)',
  'function getAirdropCount() external view returns (uint256)',
  'function allAirdrops(uint256 index) external view returns (address)',
  'event AirdropCreated(address indexed cloneAddress, address indexed creator, address token, uint256 deadline)'
]);

export const PUSH_AIRDROP_ABI = parseAbi([
  'function pushTokens(address token, address[] calldata recipients, uint256[] calldata amounts, uint256 totalRequired) external',
  'event MultiSendExecuted(address indexed token, address indexed sender, uint256 totalAddresses)'
]);

export const MERKLE_AIRDROP_ABI = parseAbi([
  'function token() external view returns (address)',
  'function merkleRoot() external view returns (bytes32)',
  'function creator() external view returns (address)',
  'function deadline() external view returns (uint256)',
  'function hasClaimed(address claimant) external view returns (bool)',
  'function claim(uint256 amount, bytes32[] calldata proof) external',
  'function refund() external',
  'event Claimed(address indexed claimant, uint256 amount)',
  'event Refunded(address indexed creator, uint256 amount)'
]);
