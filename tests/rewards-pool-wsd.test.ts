import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { DistributeRewards } from "../generated/schema"
import { DistributeRewards as DistributeRewardsEvent } from "../generated/RewardsPoolWSD/RewardsPoolWSD"
import { handleDistributeRewards } from "../src/rewards-pool-wsd"
import { createDistributeRewardsEvent } from "./rewards-pool-wsd-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let sender = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let amountStaked = BigInt.fromI32(234)
    let amount = BigInt.fromI32(234)
    let newDistributeRewardsEvent = createDistributeRewardsEvent(
      sender,
      amountStaked,
      amount
    )
    handleDistributeRewards(newDistributeRewardsEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("DistributeRewards created and stored", () => {
    assert.entityCount("DistributeRewards", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "DistributeRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "sender",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "DistributeRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amountStaked",
      "234"
    )
    assert.fieldEquals(
      "DistributeRewards",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amount",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
