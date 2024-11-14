import { BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts";
import {
  DistributeRewards as DistributeRewardsEvent,
  Withdraw as WithdrawEvent,
} from "../generated/RewardsPoolWSD/RewardsPoolWSD";
import {
  userRewardPerTokenPaidCall,
  userRewardsCall,
  withdrawableRewardsCall,
  withdrawableRewardsWrappedCall,
} from "../generated/RewardsPoolWSD/RewardsPoolWSD";
import {
  DistributeRewards,
  Withdraw,
  ProtocolEarnings,
  AccountState,
} from "../generated/schema";

// Utility function to create a unique ID for events
function createId(event: ethereum.Event): string {
  return event.transaction.hash.toHex() + "-" + event.logIndex.toString();
}

// Handler for userRewardPerTokenPaid call
export function handleUserRewardPerTokenPaid(call: userRewardPerTokenPaidCall): void {
  let account = call.inputs._account;
  let accountState = AccountState.load(account.toHex());
  if (accountState == null) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
  }
  accountState.userRewardPerTokenPaid = call.outputs.value0;
  accountState.blockNumber = call.block.number;
  accountState.blockTimestamp = call.block.timestamp;
  accountState.transactionHash = call.transaction.hash;
  accountState.save();

  log.info("User reward per token paid updated for account: {}", [account.toHex()]);
}

// Handler for userRewards call
export function handleUserRewards(call: userRewardsCall): void {
  let account = call.inputs._account;
  let accountState = AccountState.load(account.toHex());
  if (accountState == null) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
  }
  accountState.userRewards = call.outputs.value0;
  accountState.blockNumber = call.block.number;
  accountState.blockTimestamp = call.block.timestamp;
  accountState.transactionHash = call.transaction.hash;
  accountState.save();

  log.info("User rewards updated for account: {}", [account.toHex()]);
}

// Handler for withdrawableRewards call
export function handleWithdrawableRewards(call: withdrawableRewardsCall): void {
  let account = call.inputs._account;
  let accountState = AccountState.load(account.toHex());
  if (accountState == null) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
  }
  accountState.withdrawableRewards = call.outputs.value0;
  accountState.blockNumber = call.block.number;
  accountState.blockTimestamp = call.block.timestamp;
  accountState.transactionHash = call.transaction.hash;
  accountState.save();

  log.info("Withdrawable rewards updated for account: {}", [account.toHex()]);
}

// Handler for withdrawableRewardsWrapped call
export function handleWithdrawableRewardsWrapped(call: withdrawableRewardsWrappedCall): void {
  let account = call.inputs._account;
  let accountState = AccountState.load(account.toHex());
  if (accountState == null) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
  }
  accountState.withdrawableRewardsWrapped = call.outputs.value0;
  accountState.blockNumber = call.block.number;
  accountState.blockTimestamp = call.block.timestamp;
  accountState.transactionHash = call.transaction.hash;
  accountState.save();

  log.info("Withdrawable wrapped rewards updated for account: {}", [account.toHex()]);
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

  // Update protocol earnings
  let protocol = ProtocolEarnings.load("protocol");
  if (protocol == null) {
    protocol = new ProtocolEarnings("protocol");
    protocol.totalRewardsDistributed = BigInt.fromI32(0);
  }
  protocol.totalRewardsDistributed = protocol.totalRewardsDistributed.plus(event.params.amount);
  protocol.blockNumber = event.block.number;
  protocol.blockTimestamp = event.block.timestamp;
  protocol.transactionHash = event.transaction.hash;
  protocol.save();

  log.info("Protocol earnings updated. Total rewards distributed: {}", [
    protocol.totalRewardsDistributed.toString(),
  ]);
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

  // Update individual account state after withdrawal
  let accountState = AccountState.load(event.params.account.toHex());
  if (accountState == null) {
    accountState = new AccountState(event.params.account.toHex());
    accountState.account = event.params.account;
  }
  accountState.stLinkBalance = accountState.stLinkBalance.minus(event.params.amount);
  accountState.blockNumber = event.block.number;
  accountState.blockTimestamp = event.block.timestamp;
  accountState.transactionHash = event.transaction.hash;
  accountState.save();

  log.info("Account state updated for account: {} after withdrawal", [event.params.account.toHex()]);
}
