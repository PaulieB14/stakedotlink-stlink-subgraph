import { BigInt, Bytes, Address, crypto, ethereum } from "@graphprotocol/graph-ts";
import {
  DistributeRewards as DistributeRewardsEvent,
  Withdraw as WithdrawEvent,
} from "../generated/RewardsPoolWSD/RewardsPoolWSD";
import {
  AdminChanged as AdminChangedEvent,
  BeaconUpgraded as BeaconUpgradedEvent,
  Upgraded as UpgradedEvent,
} from "../generated/ERC1967Proxy/ERC1967Proxy";
import {
  DistributeRewards,
  Withdraw,
  AdminChanged,
  BeaconUpgraded,
  Upgraded,
  Earnings, // Import the Earnings entity
} from "../generated/schema";

// Utility function to create a unique ID
function createId(event: ethereum.Event): Bytes {
  return Bytes.fromHexString(
    crypto.keccak256(event.transaction.hash.concatI32(event.logIndex.toI32())).toHex()
  ) as Bytes;
}

// Function to update or initialize Earnings data
function updateEarningsData(account: Bytes, event: ethereum.Event): void {
  let accountAddress = Address.fromBytes(account);
  let contract = RewardsPoolWSD.bind(accountAddress);

  // Try to get `userRewards` and `withdrawableRewards` for the account
  let userRewardsResult = contract.try_userRewards(accountAddress);
  let withdrawableRewardsResult = contract.try_withdrawableRewards(accountAddress);

  let earnings = Earnings.load(account.toHex());
  if (!earnings) {
    earnings = new Earnings(account.toHex());
    earnings.account = account;
    earnings.stLinkBalance = BigInt.fromI32(0);
    earnings.rewardsAccumulated = BigInt.fromI32(0);
    // Set the block-related fields to avoid null errors
    earnings.blockNumber = event.block.number;
    earnings.blockTimestamp = event.block.timestamp;
    earnings.transactionHash = event.transaction.hash;
  }

  // Update based on contract call results
  if (!userRewardsResult.reverted) {
    earnings.rewardsAccumulated = userRewardsResult.value;
  }

  if (!withdrawableRewardsResult.reverted) {
    earnings.stLinkBalance = withdrawableRewardsResult.value;
  }

  // Update block-related fields for existing records
  earnings.blockNumber = event.block.number;
  earnings.blockTimestamp = event.block.timestamp;
  earnings.transactionHash = event.transaction.hash;

  earnings.save();
}

// Event handler for DistributeRewards
export function handleDistributeRewards(event: DistributeRewardsEvent): void {
  let entity = new DistributeRewards(createId(event));
  entity.amount = event.params.amount;
  entity.sender = event.params.sender;
  entity.amountStaked = event.params.amountStaked;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  // Update earnings for the sender
  updateEarningsData(event.params.sender, event);
}

// Event handler for Withdraw
export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(createId(event));
  entity.account = event.params.account;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  // Update earnings after withdrawal
  updateEarningsData(event.params.account, event);
}

// Event handler for AdminChanged
export function handleAdminChanged(event: AdminChangedEvent): void {
  let entity = new AdminChanged(createId(event));
  entity.previousAdmin = event.params.previousAdmin;
  entity.newAdmin = event.params.newAdmin;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

// Event handler for BeaconUpgraded
export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  let entity = new BeaconUpgraded(createId(event));
  entity.beacon = event.params.beacon;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

// Event handler for Upgraded
export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(createId(event));
  entity.implementation = event.params.implementation;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
