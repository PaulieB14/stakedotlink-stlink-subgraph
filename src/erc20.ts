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
  
  // Query actual balances from the contract
  fromAccountState.stLinkBalance = stLinkToken.balanceOf(event.params.from);
  toAccountState.stLinkBalance = stLinkToken.balanceOf(event.params.to);

  fromAccountState.save();
  toAccountState.save();

  // Log transfer event handling
  log.info("Handled Transfer event: {} tokens from {} to {}", [
    event.params.value.toString(),
    event.params.from.toHex(),
    event.params.to.toHex(),
  ]);
}
