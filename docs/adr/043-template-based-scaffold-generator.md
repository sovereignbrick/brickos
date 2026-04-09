# ADR-043: Template-Based App Scaffold Generator

**Status:** Accepted
**Date:** 2026-04-09

## Context

BrickOS is growing from a single app (Sovereign Health) to a multi-app ecosystem. Each new app (CRM, Voice, Almanac, Exchange) needs the same foundation: two-pool database architecture, auth handlers writing to the platform DB, encrypted PII, dark theme with brand detection, i18n (EN/DE), Docker deployment, and integration with all `brickos-*` crates.

The first scaffold generator (v1) was a 2,066-line monolithic bash script with heredoc-embedded templates. When used for the first time to generate Sovereign CRM, it required 6 manual fixes before the generated code would pass `cargo fmt` and `cargo clippy -D warnings`:

1. Title casing bug ("Sovereign Crm" instead of "Sovereign CRM")
2. Wrong `Encryptor` API (assumed Result return, missing Arc wrapping)
3. Hand-constructed email provider instead of factory function
4. Non-existent `Notifier::from_env()` method
5. Dead code warnings on model stubs
6. Formatting drift (heredoc output doesn't match `cargo fmt`)

Root cause: code embedded in bash heredocs cannot be linted, formatted, or type-checked. API signatures drifted from the actual crate implementations without detection.

## Decision

Replace the monolithic script with a **template-based architecture**:

1. **Template files** live in `ops/scaffold-templates/` as real source files (.rs, .tsx, .css, .json) that IDEs can lint and format.

2. **Static files** (no variable substitution needed) are copied verbatim. These are valid Rust/TypeScript that can be checked by `cargo fmt`, `cargo clippy`, `prettier`, and `eslint`.

3. **Template files** (`.tmpl` suffix) contain `${VARIABLE}` placeholders processed by `envsubst`. The suffix is stripped in output.

4. **Orchestrator** (`ops/scaffold-app.sh`, ~210 lines) handles argument parsing, variable computation, template rendering, and post-generation verification.

5. **Post-generation verification** automatically runs `cargo fmt`, `cargo check`, and `cargo clippy -D warnings` on the generated crate.

6. **API contracts** are documented with `scaffold-api:` comments in template source files so grep can find all crate API assumptions.

7. **Integration test** (`ops/scaffold-test.sh`) generates a test app, verifies it compiles cleanly, and cleans up.

### File counts
- Orchestrator: 210 lines (was 2,066)
- Template files: 36 (13 API, 14 frontend, 5 ops, 4 root/config)

## Alternatives Considered

- **cargo-generate:** Rust-specific template tool with handlebars syntax. Doesn't help with frontend (Next.js/TypeScript) and adds a tool dependency. Template files use `{{variable}}` syntax which conflicts with Rust macros and JSX.

- **Yeoman / cookiecutter:** General-purpose scaffolding tools. Heavy runtime dependencies (Node/Python), unfamiliar to the team, and overkill for a single-repo monorepo where templates evolve with the codebase.

- **Keep the monolithic script, add tests:** Would fix the immediate bugs but the root cause (unlintable heredoc code) remains. Every crate API change still risks silent drift.

- **Copy an existing app and rename:** Manual, error-prone, leaves dead domain-specific code. No consistency guarantee.

## Consequences

**Easier:**
- Template `.rs` files are real Rust -- `cargo fmt` and `cargo clippy` catch errors at template-authoring time, not at scaffold-generation time
- Template `.tsx` files are real TypeScript -- IDEs provide autocomplete, error highlighting
- Adding a new brickos-* crate to the scaffold means editing one real `Cargo.toml.tmpl`, not a bash heredoc
- `scaffold-api:` comments create a grepable contract between templates and crate APIs
- Integration test catches regressions automatically
- New apps start with zero manual fixes (verified)

**Harder:**
- Template directory must be kept in sync when crate APIs change (mitigated by `scaffold-api:` grep convention and integration test)
- `envsubst` cannot do conditional logic (if/else) -- all templates produce the same structure regardless of app type (mitigated by keeping templates as the common foundation; app-specific features are added after scaffold)
- Two locations to understand: orchestrator script + template directory (mitigated by clear separation and the spec document at `docs/design/019-scaffold-generator-architecture.md`)
