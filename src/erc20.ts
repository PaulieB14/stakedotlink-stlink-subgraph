import { Transfer as TransferEvent, ERC20 } from "../generated/templates/ERC20Template/ERC20";
import { AccountState } from "../generated/schema";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";

const STLINK_ADDRESS = "0xb8b295df2cd735b15BE5Eb419517Aa626fc43cD5";

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

export function handleERC20Transfer(event: TransferEvent): void {
  let fromAccountState = getOrCreateAccountState(event.params.from);
  let toAccountState = getOrCreateAccountState(event.params.to);

  log.info("Transfer event: from {} to {} amount {}", [
    event.params.from.toHex(),
    event.params.to.toHex(),
    event.params.value.toString()
  ]);

  // Get the stLink contract
  const stLinkToken = ERC20.bind(Address.fromString(STLINK_ADDRESS));
  
  // Query actual balances from the contract with error handling
  let fromBalanceResult = stLinkToken.try_balanceOf(event.params.from);
  let toBalanceResult = stLinkToken.try_balanceOf(event.params.to);

  if (!fromBalanceResult.reverted) {
    fromAccountState.stLinkBalance = fromBalanceResult.value;
    log.info("Updated FROM balance for {} to {}", [
      event.params.from.toHex(),
      fromBalanceResult.value.toString()
    ]);
  } else {
    log.error("Failed to get balance for FROM address {}", [event.params.from.toHex()]);
  }

  if (!toBalanceResult.reverted) {
    toAccountState.stLinkBalance = toBalanceResult.value;
    log.info("Updated TO balance for {} to {}", [
      event.params.to.toHex(),
      toBalanceResult.value.toString()
    ]);
  } else {
    log.error("Failed to get balance for TO address {}", [event.params.to.toHex()]);
  }

  // Update block info
  fromAccountState.blockNumber = event.block.number;
  fromAccountState.blockTimestamp = event.block.timestamp;
  toAccountState.blockNumber = event.block.number;
  toAccountState.blockTimestamp = event.block.timestamp;

  fromAccountState.save();
  toAccountState.save();

  // Log final state
  log.info("Handled Transfer event: {} tokens from {} (balance: {}) to {} (balance: {})", [
    event.params.value.toString(),
    event.params.from.toHex(),
    fromAccountState.stLinkBalance.toString(),
    event.params.to.toHex(),
    toAccountState.stLinkBalance.toString()
  ]);
}
