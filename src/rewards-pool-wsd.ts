import {
  DistributeRewards as DistributeRewardsEvent,
  Withdraw as WithdrawEvent,
} from "../generated/RewardsPoolWSD/RewardsPoolWSD";
import { ERC20 } from "../generated/templates/ERC20Template/ERC20"; // Corrected import path for ERC20 binding
import { DistributeRewards, Withdraw, AccountState } from "../generated/schema";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";

// Address of the stLINK token contract
let stLinkTokenAddress = Address.fromString("0xb8b295df2cd735b15be5eb419517aa626fc43cD5");

// Utility function to create or load an AccountState
function getOrCreateAccountState(account: Address): AccountState {
  let accountState = AccountState.load(account.toHex());
  if (!accountState) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0); // This should only be updated by querying the balance from the stLINK token contract
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
    accountState.withdrawableRewards = BigInt.fromI32(0);
    accountState.wrappedTokenBalance = BigInt.fromI32(0);
    accountState.lastUpdated = BigInt.fromI32(0);
  }
  return accountState;
}

// Helper function to update stLINK balance from ERC20 contract
function updateStLinkBalance(account: Address, accountState: AccountState): void {
  // Bind the ERC20 token contract to the stLinkTokenAddress
  let contract = ERC20.bind(stLinkTokenAddress);
  
  // Try to get the balance for the provided account address
  let balanceResult = contract.try_balanceOf(account);

  if (balanceResult.reverted) {
    log.warning("balanceOf call reverted for account: {}", [account.toHex()]);
  } else {
    log.info("balanceOf call succeeded for account: {}, balance: {}", [
      account.toHex(),
      balanceResult.value.toString(),
    ]);

    // Update the stLinkBalance with the balance obtained from the contract call
    accountState.stLinkBalance = balanceResult.value;
  }
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

  // Update AccountState for the sender, specifically for rewardsAccumulated
  let accountState = getOrCreateAccountState(event.params.sender);
  accountState.rewardsAccumulated = accountState.rewardsAccumulated.plus(event.params.amount);
  
  // Update the stLink balance
  updateStLinkBalance(event.params.sender, accountState);

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

  // Update AccountState for the account, specifically for rewards and stLink balance
  let accountState = getOrCreateAccountState(event.params.account);

  // Log current state for debugging purposes
  log.info("Handling withdraw for account {}, current rewardsAccumulated: {}, attempting to withdraw: {}", [
    accountState.account.toHex(),
    accountState.rewardsAccumulated.toString(),
    event.params.amount.toString()
  ]);

  // Ensure rewards are sufficient
  if (accountState.rewardsAccumulated.ge(event.params.amount)) {
    accountState.rewardsAccumulated = accountState.rewardsAccumulated.minus(event.params.amount);
  } else {
    log.warning("Attempted to withdraw more rewards than available for account {}. Available: {}, Attempted: {}", [
      event.params.account.toHex(),
      accountState.rewardsAccumulated.toString(),
      event.params.amount.toString()
    ]);
    return; // Do not proceed if the withdrawal amount exceeds the rewards
  }

  // Update the stLink balance after withdrawal
  updateStLinkBalance(event.params.account, accountState);

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
