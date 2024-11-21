import { Approval as ApprovalEvent, Transfer as TransferEvent } from "../generated/WrappedSDToken/WrappedSDToken";
import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Approval, Transfer, AccountState } from "../generated/schema";

// Utility function to create or load an AccountState
function getOrCreateAccountState(account: Address): AccountState {
  let accountState = AccountState.load(account.toHex());
  if (accountState == null) {
    accountState = new AccountState(account.toHex());
    accountState.account = account;
    accountState.stLinkBalance = BigInt.fromI32(0); // This should only be updated by querying the balance from the ERC1967Proxy contract
    accountState.shares = BigInt.fromI32(0);
    accountState.rewardsAccumulated = BigInt.fromI32(0);
    accountState.wrappedRewards = BigInt.fromI32(0);
    accountState.withdrawableRewards = BigInt.fromI32(0);
    accountState.wrappedTokenBalance = BigInt.fromI32(0);
    accountState.lastUpdated = BigInt.fromI32(0);
  }
  return accountState;
}

// Handle Approval Event
export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.owner = event.params.owner;
  entity.spender = event.params.spender;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

// Handle Transfer Event
export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update AccountState for 'from' address
  if (event.params.from.toHex() != "0x0000000000000000000000000000000000000000") {
    let fromAccount = getOrCreateAccountState(event.params.from);
    fromAccount.wrappedTokenBalance = fromAccount.wrappedTokenBalance.minus(event.params.value);
    fromAccount.blockNumber = event.block.number;
    fromAccount.blockTimestamp = event.block.timestamp;
    fromAccount.transactionHash = event.transaction.hash;
    fromAccount.lastUpdated = event.block.timestamp;
    fromAccount.save();
  }

  // Update AccountState for 'to' address
  if (event.params.to.toHex() != "0x0000000000000000000000000000000000000000") {
    let toAccount = getOrCreateAccountState(event.params.to);
    toAccount.wrappedTokenBalance = toAccount.wrappedTokenBalance.plus(event.params.value);
    toAccount.blockNumber = event.block.number;
    toAccount.blockTimestamp = event.block.timestamp;
    toAccount.transactionHash = event.transaction.hash;
    toAccount.lastUpdated = event.block.timestamp;
    toAccount.save();
  }
}
