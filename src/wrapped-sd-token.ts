import { Approval as ApprovalEvent, Transfer as TransferEvent } from "../generated/WrappedSDToken/WrappedSDToken"
import { BigInt } from "@graphprotocol/graph-ts"
import { Approval, Transfer, AccountState } from "../generated/schema"

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.owner = event.params.owner
  entity.spender = event.params.spender
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Update AccountState for 'from' and 'to' addresses
  if (event.params.from.toHex() != "0x0000000000000000000000000000000000000000") {
    let fromAccount = AccountState.load(event.params.from.toHex())
    if (fromAccount == null) {
      fromAccount = new AccountState(event.params.from.toHex())
      fromAccount.account = event.params.from
      fromAccount.stLinkBalance = BigInt.fromI32(0)
      fromAccount.shares = BigInt.fromI32(0)
      fromAccount.rewardsAccumulated = BigInt.fromI32(0)
      fromAccount.wrappedRewards = BigInt.fromI32(0)
      fromAccount.withdrawableRewards = BigInt.fromI32(0)
      fromAccount.wrappedTokenBalance = BigInt.fromI32(0)
    }
    fromAccount.wrappedTokenBalance = fromAccount.wrappedTokenBalance.minus(event.params.value)
    fromAccount.blockNumber = event.block.number
    fromAccount.blockTimestamp = event.block.timestamp
    fromAccount.transactionHash = event.transaction.hash
    fromAccount.lastUpdated = event.block.timestamp
    fromAccount.save()
  }

  if (event.params.to.toHex() != "0x0000000000000000000000000000000000000000") {
    let toAccount = AccountState.load(event.params.to.toHex())
    if (toAccount == null) {
      toAccount = new AccountState(event.params.to.toHex())
      toAccount.account = event.params.to
      toAccount.stLinkBalance = BigInt.fromI32(0)
      toAccount.shares = BigInt.fromI32(0)
      toAccount.rewardsAccumulated = BigInt.fromI32(0)
      toAccount.wrappedRewards = BigInt.fromI32(0)
      toAccount.withdrawableRewards = BigInt.fromI32(0)
      toAccount.wrappedTokenBalance = BigInt.fromI32(0)
    }
    toAccount.wrappedTokenBalance = toAccount.wrappedTokenBalance.plus(event.params.value)
    toAccount.blockNumber = event.block.number
    toAccount.blockTimestamp = event.block.timestamp
    toAccount.transactionHash = event.transaction.hash
    toAccount.lastUpdated = event.block.timestamp
    toAccount.save()
  }
}
