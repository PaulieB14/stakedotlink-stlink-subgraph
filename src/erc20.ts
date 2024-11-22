import { Transfer as TransferEvent } from "../generated/ERC20Template/ERC20Template";
import { AccountState } from "../generated/schema";
import { BigInt, log } from "@graphprotocol/graph-ts";

// Handle Transfer event
export function handleERC20Transfer(event: TransferEvent): void {
  let from = event.params.from.toHex();
  let to = event.params.to.toHex();

  // Update sender balance
  let fromAccount = AccountState.load(from);
  if (fromAccount == null) {
    fromAccount = new AccountState(from);
    fromAccount.account = event.params.from;
    fromAccount.stLinkBalance = BigInt.fromI32(0);
    fromAccount.shares = BigInt.fromI32(0);
    fromAccount.rewardsAccumulated = BigInt.fromI32(0);
    fromAccount.wrappedRewards = BigInt.fromI32(0);
    fromAccount.withdrawableRewards = BigInt.fromI32(0);
    fromAccount.wrappedTokenBalance = BigInt.fromI32(0);
  }
  fromAccount.stLinkBalance = fromAccount.stLinkBalance.minus(event.params.value);
  fromAccount.save();

  // Update receiver balance
  let toAccount = AccountState.load(to);
  if (toAccount == null) {
    toAccount = new AccountState(to);
    toAccount.account = event.params.to;
    toAccount.stLinkBalance = BigInt.fromI32(0);
    toAccount.shares = BigInt.fromI32(0);
    toAccount.rewardsAccumulated = BigInt.fromI32(0);
    toAccount.wrappedRewards = BigInt.fromI32(0);
    toAccount.withdrawableRewards = BigInt.fromI32(0);
    toAccount.wrappedTokenBalance = BigInt.fromI32(0);
  }
  toAccount.stLinkBalance = toAccount.stLinkBalance.plus(event.params.value);
  toAccount.save();

  // Log transfer event handling
  log.info("Handled Transfer event: {} tokens from {} to {}", [
    event.params.value.toString(),
    from,
    to,
  ]);
}
