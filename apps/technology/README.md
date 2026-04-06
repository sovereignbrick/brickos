```
// ============================================================================
//                      SOVEREIGN INFRASTRUCTURE
//
//                     IDENTITY . NODES . TRANSPORT
//
//   Infrastructure is the ground you stand on.
//   If someone else owns it, you are a tenant.
//
//   Cloud providers read your data. ISPs log your traffic.
//   App stores decide what software you may run.
//
//   Sovereign Infrastructure is the foundation layer --
//   self-hosted nodes, censorship-resistant networks,
//   and identity you control with your own keys.
//
//   Bitcoin introduced Proof of Work.
//   NOSTR introduced Proof of Publication.
//   This project introduces:
//
//                       PROOF OF OWNERSHIP
//
//   Your keys, your node, your identity, your rules.
//
//   Inspired by the philosophy of sovereignty and the
//   ideas explored in the book "Brick by Brick".
//
//   Run your own node.
//   Own your identity.
//   Build infrastructure sovereignty.
//
//   https://brickos.io/
// ============================================================================
```

# Technology & Privacy Pillar (BrickOS)

*"Is my infrastructure sovereign?"*

The Technology & Privacy pillar is the foundation layer -- sovereign identity, self-hosted infrastructure, and the transport stack that keeps everything working across all connectivity levels.

## Apps

| App | Status | Description |
|-----|--------|-------------|
| [**Sovereign Link**](sovereign-link/) | **Live** | URL shortener + QR codes, dual-mode platform + Start9 |
| **Sovereign Identity** | Planned | NOSTR + Bitcoin identity, ZK linkage, trust scores, SSO for all BrickOS apps |
| **BrickOS NOSTR Relay** | Planned | Personal relay on Start9, platform relay for services |

## Foundation Services

- **Sovereign Identity** -- NOSTR keypair + Bitcoin wallet + BitChat ID, zero-knowledge linkage
- **Trust Score Engine** -- Reputation earned through trades, feedback, and participation (Rookie to Arbiter)
- **Grab Bag** -- Portable encrypted identity export (USB/Coldcard/phone) for migration scenarios
- **TollGate** -- Permissionless WiFi access via Cashu micropayments (1 sat/min)
- **Zapstore** -- Censorship-resistant app distribution via NOSTR (NIP-82)
- **Cashu Mint** -- Private ecash payments for all platform services
- **Network Degradation** -- Clearnet > Tor > Satellite > Mesh/BitChat > Sneakernet
- **Local-First Storage** -- CRDT/event sourcing, Start9 node as canonical store, thin clients sync

See [docs/design/001-sovereign-stack-vision.md](../../docs/design/001-sovereign-stack-vision.md) for the full design.
