import { BigInt, Bytes, crypto, ethereum } from "@graphprotocol/graph-ts";
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
  Earnings,
} from "../generated/schema";

// Import the RewardsPoolWSD contract for view functions
import { RewardsPoolWSD } from "../generated/RewardsPoolWSD/RewardsPoolWSD";

function createId(event: ethereum.Event): Bytes {
  return Bytes.fromHexString(
    crypto.keccak256(event.transaction.hash.concatI32(event.logIndex.toI32())).toHex()
  ) as Bytes;
}

// Helper function to update user reward data
function updateEarningsData(account: Bytes): void {
  let contract = RewardsPoolWSD.bind(account);

  // Try to get `userRewards` and `withdrawableRewards` for the account
  let userRewardsResult = contract.try_userRewards(account);
  let withdrawableRewardsResult = contract.try_withdrawableRewards(account);

  let earnings = Earnings.load(account.toHex());
  if (!earnings) {
    earnings = new Earnings(account.toHex());
    earnings.account = account;
    earnings.stLinkBalance = BigInt.fromI32(0);
    earnings.rewardsAccumulated = BigInt.fromI32(0);
  }

  // Update based on contract call results
  if (!userRewardsResult.reverted) {
    earnings.rewardsAccumulated = userRewardsResult.value;
  }

  if (!withdrawableRewardsResult.reverted) {
    earnings.stLinkBalance = withdrawableRewardsResult.value;
  }

  earnings.save();
}

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
  updateEarningsData(event.params.sender);
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(createId(event));
  entity.account = event.params.account;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  // Update earnings after withdrawal
  updateEarningsData(event.params.account);
}

export function handleAdminChanged(event: AdminChangedEvent): void {
  let entity = new AdminChanged(createId(event));
  entity.previousAdmin = event.params.previousAdmin;
  entity.newAdmin = event.params.newAdmin;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  let entity = new BeaconUpgraded(createId(event));
  entity.beacon = event.params.beacon;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(createId(event));
  entity.implementation = event.params.implementation;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
