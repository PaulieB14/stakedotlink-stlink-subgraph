import {
  DistributeRewards as DistributeRewardsEvent,
  Withdraw as WithdrawEvent
} from "../generated/RewardsPoolWSD/RewardsPoolWSD"
import { DistributeRewards, Withdraw } from "../generated/schema"

export function handleDistributeRewards(event: DistributeRewardsEvent): void {
  let entity = new DistributeRewards(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sender = event.params.sender
  entity.amountStaked = event.params.amountStaked
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWithdraw(event: WithdrawEvent): void {
  let entity = new Withdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
