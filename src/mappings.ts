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
  Earnings, // Import the Earnings entity
} from "../generated/schema";

function createId(event: ethereum.Event): Bytes {
  return Bytes.fromHexString(
    crypto.keccak256(event.transaction.hash.concatI32(event.logIndex.toI32())).toHex()
  ) as Bytes;
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

  // Update or create Earnings entity
  let earningsId = event.params.sender.toHex();
  let earnings = Earnings.load(earningsId);

  if (!earnings) {
    earnings = new Earnings(earningsId);
    earnings.account = event.params.sender;
    earnings.stLinkBalance = BigInt.fromI32(0); // Initialize to zero or another appropriate starting value
    earnings.rewardsAccumulated = BigInt.fromI32(0); // Initialize to zero or another appropriate starting value
  }

  // Update earnings based on this event
  earnings.stLinkBalance = earnings.stLinkBalance.plus(event.params.amountStaked);
  earnings.rewardsAccumulated = earnings.rewardsAccumulated.plus(event.params.amount);
  earnings.blockNumber = event.block.number;
  earnings.blockTimestamp = event.block.timestamp;
  earnings.transactionHash = event.transaction.hash;

  earnings.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(createId(event));
  entity.account = event.params.account;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  // Update or adjust Earnings based on withdrawal
  let earningsId = event.params.account.toHex();
  let earnings = Earnings.load(earningsId);

  if (earnings) {
    earnings.stLinkBalance = earnings.stLinkBalance.minus(event.params.amount);
    earnings.blockNumber = event.block.number;
    earnings.blockTimestamp = event.block.timestamp;
    earnings.transactionHash = event.transaction.hash;
    earnings.save();
  }
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
