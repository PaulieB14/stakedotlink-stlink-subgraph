import {
  AdminChanged as AdminChangedEvent,
  BeaconUpgraded as BeaconUpgradedEvent,
  Upgraded as UpgradedEvent,
  ERC1967Proxy as ERC1967ProxyContract,  // Importing this for event handling from the Proxy
} from "../generated/ERC1967Proxy/ERC1967Proxy";

import { ERC20 } from "../generated/ERC20/ERC20"; // Import the ERC20 binding to access functions like balanceOf
import { AdminChanged, BeaconUpgraded, Upgraded, AccountState } from "../generated/schema";
import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";

// Update this address to point to the stLINK token contract address (Proxy contract address)
let stLinkTokenAddress = Address.fromString("0xb8b295df2cd735b15BE5Eb419517Aa626fc43cD5");

// Handle AdminChanged event
export function handleAdminChanged(event: AdminChangedEvent): void {
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
  updateAccountBalance(stLinkTokenAddress, event.params.newAdmin, event);
}

// Handle BeaconUpgraded event
export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
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

// Handle Upgraded event
export function handleUpgraded(event: UpgradedEvent): void {
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
  let contract = ERC20.bind(contractAddress);  // Make sure to use ERC20 binding here

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
