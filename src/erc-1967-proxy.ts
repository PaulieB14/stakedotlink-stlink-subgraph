import {
  AdminChanged as AdminChangedEvent,
  BeaconUpgraded as BeaconUpgradedEvent,
  Upgraded as UpgradedEvent,
  ERC1967Proxy as ERC1967ProxyContract
} from "../generated/ERC1967Proxy/ERC1967Proxy";

import { Transfer as TransferEvent } from "../generated/templates/ERC20Template/ERC20";
import { ERC20Template } from "../generated/templates";
import { ERC20 } from "../generated/templates/ERC20Template/ERC20";
import { AdminChanged, BeaconUpgraded, Upgraded, AccountState } from "../generated/schema";
import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";

const STLINK_ADDRESS = "0xb8b295df2cd735b15be5eb419517aa626fc43cD5";

export function handleAdminChanged(event: AdminChangedEvent): void {
  // Create ERC20Template instance if it hasn't been created yet
  ERC20Template.create(Address.fromString(STLINK_ADDRESS));
  let entity = new AdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.previousAdmin = event.params.previousAdmin;
  entity.newAdmin = event.params.newAdmin;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update balance when the admin changes
  updateAccountBalance(Address.fromString(STLINK_ADDRESS), event.params.newAdmin, event);
}

// Handle ERC20 Transfer events directly from the proxy
export function handleERC20Transfer(event: TransferEvent): void {
  log.info("Handling Transfer event in Proxy for: from {} to {} amount {}", [
    event.params.from.toHex(),
    event.params.to.toHex(),
    event.params.value.toString()
  ]);

  // Update balances for both addresses
  updateAccountBalance(Address.fromString(STLINK_ADDRESS), event.params.from, event);
  updateAccountBalance(Address.fromString(STLINK_ADDRESS), event.params.to, event);

  // Create ERC20Template instance if it hasn't been created yet
  ERC20Template.create(Address.fromString(STLINK_ADDRESS));
}

export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  // Create ERC20Template instance if it hasn't been created yet
  ERC20Template.create(Address.fromString(STLINK_ADDRESS));
  let entity = new BeaconUpgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.beacon = event.params.beacon;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Optionally update balance for relevant accounts
  // updateAccountBalance(stLinkTokenAddress, relevantAccountAddress, event);
}

export function handleUpgraded(event: UpgradedEvent): void {
  // Create ERC20Template instance if it hasn't been created yet
  ERC20Template.create(Address.fromString(STLINK_ADDRESS));
  let entity = new Upgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.implementation = event.params.implementation;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Optionally update balance for relevant accounts
  // updateAccountBalance(stLinkTokenAddress, relevantAccountAddress, event);
}

// Helper function to update account balance
function updateAccountBalance(
  contractAddress: Address,
  accountAddress: Address,
  event: ethereum.Event
): void {
  // Log the start of the updateAccountBalance process
  log.info("Attempting to update balance for account: {}, using contract: {}", [
    accountAddress.toHex(),
    contractAddress.toHex(),
  ]);

  // Bind the ERC20 token contract to the stLinkTokenAddress
  let contract = ERC20.bind(contractAddress); // Use ERC20 binding here

  // Try to get the balance for the provided account address
  let balanceResult = contract.try_balanceOf(accountAddress);

  if (balanceResult.reverted) {
    log.warning("balanceOf call reverted for account: {}", [accountAddress.toHex()]);
  } else {
    log.info("balanceOf call succeeded for account: {}, balance: {}", [
      accountAddress.toHex(),
      balanceResult.value.toString(),
    ]);

    // Load or create an AccountState entity for storing balance information
    let accountState = AccountState.load(accountAddress.toHex());
    if (accountState == null) {
      accountState = new AccountState(accountAddress.toHex());
      accountState.account = accountAddress;
      accountState.stLinkBalance = BigInt.fromI32(0); // Initialize as zero if not previously defined
      accountState.rewardsAccumulated = BigInt.fromI32(0);
      accountState.wrappedRewards = BigInt.fromI32(0);
      accountState.withdrawableRewards = BigInt.fromI32(0);
      accountState.wrappedTokenBalance = BigInt.fromI32(0);
      accountState.shares = BigInt.fromI32(0); // Add initialization for shares if necessary
    }

    // Update the stLinkBalance with the balance obtained from the contract call
    accountState.stLinkBalance = balanceResult.value;
    accountState.blockNumber = event.block.number;
    accountState.blockTimestamp = event.block.timestamp;
    accountState.transactionHash = event.transaction.hash;
    accountState.lastUpdated = event.block.timestamp;

    // Log the updated balance for debugging
    log.info("Updated stLinkBalance for account: {} to: {}", [
      accountAddress.toHex(),
      balanceResult.value.toString(),
    ]);

    accountState.save();
  }
}
