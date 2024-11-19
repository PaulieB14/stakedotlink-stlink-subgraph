Subgraph for Stake.Link stLINK Earnings Tracker

This repository contains the subgraph code for Stake.Link, designed to help track earnings for stLINK holders. This subgraph is built on The Graph Protocol, enabling efficient querying of blockchain data to provide insights into staking rewards and individual earnings.

Overview

The Stake.Link subgraph indexes data from:

RewardsPoolWSD: Captures key events such as DistributeRewards and Withdraw to provide detailed information on user rewards, balances, and overall protocol earnings.

ERC1967Proxy: Monitors events like AdminChanged and Upgraded to track changes in contract administration and upgrades.

The goal of this subgraph is to offer an accessible way for stLINK holders to query information about their staking earnings, rewards distributions, and overall protocol activity.
