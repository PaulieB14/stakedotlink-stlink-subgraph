import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  DistributeRewards,
  Withdraw
} from "../generated/RewardsPoolWSD/RewardsPoolWSD"

export function createDistributeRewardsEvent(
  sender: Address,
  amountStaked: BigInt,
  amount: BigInt
): DistributeRewards {
  let distributeRewardsEvent = changetype<DistributeRewards>(newMockEvent())

  distributeRewardsEvent.parameters = new Array()

  distributeRewardsEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )
  distributeRewardsEvent.parameters.push(
    new ethereum.EventParam(
      "amountStaked",
      ethereum.Value.fromUnsignedBigInt(amountStaked)
    )
  )
  distributeRewardsEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return distributeRewardsEvent
}

export function createWithdrawEvent(
  account: Address,
  amount: BigInt
): Withdraw {
  let withdrawEvent = changetype<Withdraw>(newMockEvent())

  withdrawEvent.parameters = new Array()

  withdrawEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  withdrawEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return withdrawEvent
}
