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
import { ERC1967Proxy } from "../generated/ERC1967Proxy/ERC1967Proxy";

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

  // Fetch balanceOf using `try_balanceOf`
  let balanceOfResult = contract.try_balanceOf(account);
  if (!balanceOfResult.reverted) {
    accountState.stLinkBalance = balanceOfResult.value;
    log.info("Fetched stLinkBalance for account {}: {}", [
      account.toHex(),
      balanceOfResult.value.toString(),
    ]);
  } else {
    log.warning("balanceOf call reverted for account {}", [account.toHex()]);
  }

  // Fetch sharesOf using `try_sharesOf`
  let sharesOfResult = contract.try_sharesOf(account);
  if (!sharesOfResult.reverted) {
    accountState.shares = sharesOfResult.value;
    log.info("Fetched sharesOf for account {}: {}", [
      account.toHex(),
      sharesOfResult.value.toString(),
    ]);
  } else {
    log.warning("sharesOf call reverted for account {}", [account.toHex()]);
  }

  // Fetch userRewardPerTokenPaid
  let userRewardPerTokenPaidResult = contract.try_userRewardPerTokenPaid(account);
  if (!userRewardPerTokenPaidResult.reverted) {
    accountState.userRewardPerTokenPaid = userRewardPerTokenPaidResult.value;
    log.info("Fetched userRewardPerTokenPaid for account {}: {}", [
      account.toHex(),
      userRewardPerTokenPaidResult.value.toString(),
    ]);
  } else {
    log.warning("userRewardPerTokenPaid call reverted for account {}", [account.toHex()]);
  }

  // Fetch userRewards
  let userRewardsResult = contract.try_userRewards(account);
  if (!userRewardsResult.reverted) {
    accountState.userRewards = userRewardsResult.value;
    log.info("Fetched userRewards for account {}: {}", [
      account.toHex(),
      userRewardsResult.value.toString(),
    ]);
  } else {
    log.warning("userRewards call reverted for account {}", [account.toHex()]);
  }

  // Fetch withdrawableRewards
  let withdrawableRewardsResult = contract.try_withdrawableRewards(account);
  if (!withdrawableRewardsResult.reverted) {
    accountState.withdrawableRewards = withdrawableRewardsResult.value;
    log.info("Fetched withdrawableRewards for account {}: {}", [
      account.toHex(),
      withdrawableRewardsResult.value.toString(),
    ]);
  } else {
    log.warning("withdrawableRewards call reverted for account {}", [account.toHex()]);
  }

  // Fetch withdrawableRewardsWrapped
  let withdrawableRewardsWrappedResult = contract.try_withdrawableRewardsWrapped(account);
  if (!withdrawableRewardsWrappedResult.reverted) {
    accountState.withdrawableRewardsWrapped = withdrawableRewardsWrappedResult.value;
    log.info("Fetched withdrawableRewardsWrapped for account {}: {}", [
      account.toHex(),
      withdrawableRewardsWrappedResult.value.toString(),
    ]);
  } else {
    log.warning("withdrawableRewardsWrapped call reverted for account {}", [account.toHex()]);
  }

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
