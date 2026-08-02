```
// ============================================================================
//                          SOVEREIGN SEED
//
//                  DICE . ENTROPY . SELF-CUSTODY
//
//   Your Bitcoin wallet is only as sovereign as the entropy that created it.
//   Hardware RNGs can fail. Firmware can lie. Companies can be compromised.
//
//   Sovereign Seed replaces all of that with dice you can hold in your hand.
//
//   Roll 100 dice. SHA-256 concentrates them into 256 bits of clean entropy.
//   BIP39 maps those bits to 24 words. The words are yours, and only yours.
//
//   No RNG. No network. No trust required.
//   Press F12. Read every line. Verify the math yourself.
//
//   https://brickos.io/
// ============================================================================
```

# BIP39 Dice Seed Generator

**BrickOS Security Toolkit** · `apps/security/sovereign-seed` · [Sovereign Brick](https://github.com/sovereignbrick)

A self-contained, air-gap-friendly tool for generating Bitcoin (BIP39) 24-word seed phrases from physical dice rolls. Designed for training, education, and structured self-custody exercises. No dependencies, no build step, no internet required, two HTML files you can open in any modern browser.

---

## Files

| File | Purpose |
|---|---|
| `bip39_dice_tool_training.html` | Interactive tool: enter dice rolls to generate 24-word seed + optional Diceware passphrase |
| `facilitator_handout.html` | One-page printable reference for workshop facilitators (A4/Letter, print-ready) |

---

## What It Does

The tool takes physical randomness you supply, primarily dice rolls, and turns it into a BIP39-compliant 24-word seed phrase using:

1. **Dice rolls** (primary entropy source, target: 100 rolls, 258 bits)
2. **Optional photo** (supplemental entropy from camera sensor noise)
3. **Optional extra input** (coin flips, random keystrokes)
4. **SHA-256 whitening** — condenses the pool into 256 uniform bits
5. **BIP39 checksum** — first 8 bits of SHA-256(entropy) appended
6. **Word mapping** — 264 bits split into 24 x 11-bit indices, 24 words
7. **PBKDF2 derivation** — optional passphrase turns words into a 512-bit master seed

The design principle: **you supply all randomness; the computer only reshapes it.** There is no software RNG anywhere in the code.

---

## Security Model

### What is verified

| Claim | How it was checked |
|---|---|
| No `Math.random` / `crypto.getRandomValues` | `grep` search of the file, zero hits in executable code |
| No network code (`fetch`, `XMLHttpRequest`, `WebSocket`, external `<script>`) | `grep` search, zero hits; only appear in comments |
| NFKD normalization applied in `derive()` | BIP39 spec requires `.normalize('NFKD')` on mnemonic and passphrase before PBKDF2; implemented and marked `// BIP39 spec: NFKD required` |
| BIP39 word-index computation is correct | Ran all-zeros entropy test: 256 zero bits + SHA-256 checksum byte `0x66` produces 23x`abandon` + `art` |
| PBKDF2 master seed derivation is correct | Ran BIP39 TREZOR test vector: `abandon`x23 + `art` + passphrase `TREZOR` produces exact 512-bit master seed match |
| BIP39 wordlist is authentic | SHA-256 fingerprint `2f5eed...3b24dbda` matches `bitcoin/bips` `english.txt` (per embedded comment) |
| EFF wordlist is authentic | SHA-256 `addd3553...996b903e`, all 7776 words, codes 11111-66666, no duplicates (per embedded comment) |

### What this is NOT

- It is **not** a production seed generator. Generate real seeds on a dedicated hardware signing device (Coldcard, SeedSigner, etc.).
- Running in a browser on a daily-use machine is not air-gapped. The OS, browser extensions, and clipboard are attack surfaces.
- BrickOS branding does not constitute a security endorsement. Verify independently.

---

## Usage

### Quick start

1. Download both HTML files.
2. Disconnect from the internet (WiFi/Ethernet off).
3. Open `bip39_dice_tool_training.html` in a browser, it works fully offline.
4. Press **F12 -> View Source** to read and audit the code before entering any secrets.
5. Roll at least 100 dice (aim for all 1-6 rolls, no cherry-picking). Enter them in the Dice box.
6. Optionally: take a fresh photo and add it as supplemental entropy.
7. Click **Whiten & Generate**, your 24-word phrase appears.
8. Optionally add a Diceware passphrase (use the passphrase dice helper, 6+ words recommended).
9. Write the words on paper or stamp them into steel. Clear the browser tab. Never screenshot or store digitally.

### Facilitator-led workshop

Use `facilitator_handout.html` as a one-page printed reference.
- Print to A4 or Letter (use the **Print / Save as PDF** button).
- Walk participants through Sections A (entropy model), B (five audit questions), C (passphrase guidance).
- Audit Question 2 ("does anything leave the machine?") can be verified live by searching the source for `fetch(`, `XMLHttpRequest`, and `WebSocket`.

---

## Entropy Model

```
Your dice (100 rolls ~ 258 bits)
  + Optional photo (unmeasured supplement)
  + Optional coin flips / extra typing
        |
        v
   SHA-256 whitening
   (concentrates into 256 uniform bits)
        |
        v
   + 8-bit BIP39 checksum
        |
        v
   264 bits -> 24 x 11-bit groups -> 24 words
        |
        v
   + Optional Diceware passphrase (via PBKDF2, 2048 rounds)
        |
        v
   512-bit master seed (wallet root)
```

**Key property:** SHA-256 is a one-way extractor, not a randomness generator. Output entropy is at most min(input entropy, 256 bits). If you roll 100 fair dice you put in ~258 bits; the photo and coins are insurance, not additional capacity beyond 256.

---

## Passphrase Strength

| Diceware words | Entropy | Verdict |
|---|---|---|
| 3 | ~39 bits | Too weak |
| 4 | ~52 bits | Minimum floor |
| 5 | ~65 bits | Good |
| 6 | ~77 bits | Strong (recommended) |
| 7-8 | ~90-103 bits | Very strong |

A single dictionary word or famous phrase gives near-zero real entropy regardless of length. Use the built-in Diceware generator (5 dice rolls = 1 word from the EFF 7776-word list).

---

## Wordlist Licensing

| Wordlist | License | Attribution |
|---|---|---|
| BIP39 English (2048 words) | MIT | `bitcoin/bips` repository, `bip-0039/english.txt` |
| EFF Large Diceware (7776 words) | **Creative Commons Attribution 3.0 (CC BY 3.0)** | **Electronic Frontier Foundation (EFF)** · `eff.org/files/2016/07/18/eff_large_wordlist.txt` |

The EFF CC BY 3.0 license requires this attribution to be preserved in any distribution of the tool. It is included in the HTML footer and this README.

---

## Version History

| Version | Date | Change |
|---|---|---|
| v1.0.0 | 2026-08-02 | Initial public release. BIP39 dice seed generator with annotated training tool and printable facilitator handout. NFKD normalization applied, algorithm verified against official BIP39 test vectors, EFF Diceware attribution added. |

---

## References

- [BIP-0039 specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP39 English wordlist](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)
- [EFF Large Diceware Wordlist](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt)
- [TREZOR BIP39 test vectors](https://github.com/trezor/python-mnemonic/blob/master/vectors.json)
- [Ian Coleman's BIP39 tool](https://github.com/iancoleman/bip39) (reference implementation)
- [Coldcard dice entropy import](https://coldcard.com/docs/dice-rolls) (inspiration for the approach)
