# Finance Pillar (BrickOS)

*"Can I transact, save, and trade without banks?"*

The Finance pillar covers sovereign economic activity -- trading, saving, and exchanging value without dependence on banks or centralized payment processors.

## Apps

| App | Status | Description |
|-----|--------|-------------|
| [**BTC Tracker**](btc-tracker/) | In progress | Bitcoin portfolio tracking |
| **Sovereign Exchange** | Planned | P2P marketplace for goods, services, and skills -- barter + Bitcoin (Lightning/on-chain) + Cashu ecash with 2-of-3 escrow |
| **Sovereign Vote** | Planned | Community governance, arbiter elections, fee policies, DAO treasury management |
| **Sovereign Mint** | Planned | BrickOS Cashu mint for private micropayments (NIP-60/61) |

## Key Concepts

- **Barter is free, Bitcoin trades have a small fee** -- drives adoption in normal times, sustains infrastructure
- **2-of-3 multisig escrow** -- buyer, seller, and community-elected arbiter
- **Cashu nutzaps (NIP-61)** -- private payments where the mint cannot link sender to recipient
- **Trust tiers** -- Rookie to Arbiter, earned through real trades and peer feedback
- **Listings are NOSTR events** -- gossip through relay network, work offline via local cache
- **Emergency mode** -- paid subscribers get free marketplace access when systems fail

See [docs/design/001-sovereign-stack-vision.md](../../docs/design/001-sovereign-stack-vision.md) for the full design.
