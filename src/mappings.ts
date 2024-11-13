import { BigInt, Bytes, Address, crypto, ethereum, log } from "@graphprotocol/graph-ts";
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
  ProtocolEarnings,
  AccountState,
} from "../generated/schema";
import { RewardsPoolWSD } from "../generated/RewardsPoolWSD/RewardsPoolWSD";

// Utility function to create a unique ID for events
function createId(event: ethereum.Event): Bytes {
  return Bytes.fromHexString(
    crypto.keccak256(event.transaction.hash.concatI32(event.logIndex.toI32())).toHex()
  ) as Bytes;
}

// Update ProtocolEarnings entity
function updateProtocolEarnings(event: ethereum.Event): void {
  let protocol = ProtocolEarnings.load("protocol");

  if (!protocol) {
    protocol = new ProtocolEarnings("protocol");
    protocol.totalRewardsDistributed = BigInt.fromI32(0);
  }

  // Update with event data
  protocol.blockNumber = event.block.number;
  protocol.blockTimestamp = event.block.timestamp;
  protocol.transactionHash = event.transaction.hash;
  protocol.save();

  log.info("ProtocolEarnings updated at block number: {}", [event.block.number.toString()]);
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
    accountState.wrappedRewards = BigInt.fromI32(0);
  }

  // Fetch balanceOf without `try_`
  let balanceOfResult = contract.balanceOf(account);
  accountState.stLinkBalance = balanceOfResult;
  log.info("Fetched stLinkBalance for account {}: {}", [
    account.toHex(),
    balanceOfResult.toString(),
  ]);

  // Fetch sharesOf without `try_`
  let sharesOfResult = contract.sharesOf(account);
  log.info("Fetched sharesOf for account {}: {}", [
    account.toHex(),
    sharesOfResult.toString(),
  ]);

  accountState.blockNumber = event.block.number;
  accountState.blockTimestamp = event.block.timestamp;
  accountState.transactionHash = event.transaction.hash;
  accountState.save();

  log.info("AccountState updated for account: {}", [account.toHex()]);
}

// Event handler for DistributeRewards
export function handleDistributeRewards(event: DistributeRewardsEvent): void {
  log.info("Processing DistributeRewards event for sender: {}", [event.params.sender.toHex()]);

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
  log.info("Processing Withdraw event for account: {}", [event.params.account.toHex()]);

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
  log.info("Processing AdminChanged event from {} to {}", [
    event.params.previousAdmin.toHex(),
    event.params.newAdmin.toHex(),
  ]);

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
  log.info("Processing BeaconUpgraded event for beacon: {}", [event.params.beacon.toHex()]);

  let entity = new BeaconUpgraded(createId(event));
  entity.beacon = event.params.beacon;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

// Event handler for Upgraded
export function handleUpgraded(event: UpgradedEvent): void {
  log.info("Processing Upgraded event for implementation: {}", [event.params.implementation.toHex()]);

  let entity = new Upgraded(createId(event));
  entity.implementation = event.params.implementation;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
