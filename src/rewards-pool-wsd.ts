import {
  DistributeRewards as DistributeRewardsEvent,
  Withdraw as WithdrawEvent
} from "../generated/RewardsPoolWSD/RewardsPoolWSD";
import { DistributeRewards, Withdraw, AccountState } from "../generated/schema";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";

// Utility function to create or load an AccountState
function getOrCreateAccountState(account: Address): AccountState {
  let accountState = AccountState.load(account.toHex());
  if (!accountState) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
    accountState.withdrawableRewards = BigInt.fromI32(0);
    accountState.wrappedTokenBalance = BigInt.fromI32(0);
    accountState.lastUpdated = BigInt.fromI32(0);
  }
  return accountState;
}

// Handle DistributeRewards Event
export function handleDistributeRewards(event: DistributeRewardsEvent): void {
  let entity = new DistributeRewards(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.sender = event.params.sender;
  entity.amountStaked = event.params.amountStaked;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update AccountState for the sender
  let accountState = getOrCreateAccountState(event.params.sender);
  accountState.rewardsAccumulated = accountState.rewardsAccumulated.plus(event.params.amount);
  accountState.blockNumber = event.block.number;
  accountState.blockTimestamp = event.block.timestamp;
  accountState.transactionHash = event.transaction.hash;
  accountState.lastUpdated = event.block.timestamp;

  log.info("Updated rewardsAccumulated for account {} to {}", [
    accountState.account.toHex(),
    accountState.rewardsAccumulated.toString()
  ]);

  accountState.save();
}

// Handle Withdraw Event
export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.account = event.params.account;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update AccountState for the account
  let accountState = getOrCreateAccountState(event.params.account);

  // Prevent negative balance
  if (accountState.stLinkBalance.ge(event.params.amount)) {
    accountState.stLinkBalance = accountState.stLinkBalance.minus(event.params.amount);
  } else {
    accountState.stLinkBalance = BigInt.fromI32(0);
    log.warning("Attempted to withdraw more than available balance for account {}", [
      event.params.account.toHex()
    ]);
  }

  accountState.blockNumber = event.block.number;
  accountState.blockTimestamp = event.block.timestamp;
  accountState.transactionHash = event.transaction.hash;
  accountState.lastUpdated = event.block.timestamp;

  log.info("Updated stLinkBalance for account {} to {}", [
    accountState.account.toHex(),
    accountState.stLinkBalance.toString()
  ]);

  accountState.save();
}
