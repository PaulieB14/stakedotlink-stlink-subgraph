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
  Earnings,
  ProtocolEarnings,
  AccountState,
} from "../generated/schema";
import { RewardsPoolWSD } from "../generated/RewardsPoolWSD/RewardsPoolWSD";

// Utility function to create a unique ID
function createId(event: ethereum.Event): Bytes {
  return Bytes.fromHexString(
    crypto.keccak256(event.transaction.hash.concatI32(event.logIndex.toI32())).toHex()
  ) as Bytes;
}

// Update ProtocolEarnings entity with total rewards and staked values
function updateProtocolEarnings(event: ethereum.Event): void {
  let protocol = ProtocolEarnings.load("protocol");
  let contract = RewardsPoolWSD.bind(Address.fromString("0x8753C00D1a94D04A01b931830011d882A3F8Cc72"));

  if (!protocol) {
    protocol = new ProtocolEarnings("protocol");
    protocol.totalStaked = BigInt.fromI32(0);
    protocol.totalRewardsDistributed = BigInt.fromI32(0);
  }

  let totalStakedResult = contract.try_totalStaked();
  if (!totalStakedResult.reverted) {
    protocol.totalStaked = totalStakedResult.value;
  }

  protocol.blockNumber = event.block.number;
  protocol.blockTimestamp = event.block.timestamp;
  protocol.transactionHash = event.transaction.hash;
  protocol.save();
}

// Update individual account state in AccountState entity
function updateAccountState(account: Address, event: ethereum.Event): void {
  let accountState = AccountState.load(account.toHex());
  let contract = RewardsPoolWSD.bind(Address.fromString("0x8753C00D1a94D04A01b931830011d882A3F8Cc72"));

  if (!accountState) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
  }

  let userRewardsResult = contract.try_userRewards(account);
  if (!userRewardsResult.reverted) {
    accountState.rewardsAccumulated = userRewardsResult.value;
  }

  let withdrawableRewardsResult = contract.try_withdrawableRewards(account);
  if (!withdrawableRewardsResult.reverted) {
    accountState.stLinkBalance = withdrawableRewardsResult.value;
  }

  accountState.blockNumber = event.block.number;
  accountState.blockTimestamp = event.block.timestamp;
  accountState.transactionHash = event.transaction.hash;
  accountState.save();
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

  // Update protocol and account earnings
  updateProtocolEarnings(event);
  updateAccountState(event.params.sender, event);
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

  // Update protocol and account state after withdrawal
  updateProtocolEarnings(event);
  updateAccountState(event.params.account, event);
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
