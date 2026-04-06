# ADR-038: Per-Organization Link Namespaces in Sovereign Link

**Status:** Accepted
**Date:** 2026-04-06

## Context

Sovereign Link serves multiple organizations (BrickOS, DieFitmacher, Dr. Boz, etc.). With a global namespace, only one organization can claim a code like "shi" or "health". This limits the platform as it scales.

## Decision

Each organization gets a namespace prefix derived from its slug:

```
brickos.io/r/{code}              -> BrickOS root namespace (no prefix)
brickos.io/r/{org-slug}/{code}   -> Organization namespace
```

Multiple organizations can have the same code within their own namespace. The `short_links` table enforces `UNIQUE(owner_org_id, code)` instead of globally unique codes.

Custom domains (e.g., `links.diefitmacher.at`) resolve to the organization's namespace.

## Alternatives Considered

- **Global unique codes:** First-come, first-served. Simple but limiting. One org claims "health" and nobody else can use it.
- **Org-prefix in code:** `dfm-shi` instead of `dfm/shi`. Flatter URL but less clear hierarchy. Harder to parse.
- **Subdomains per org:** `dfm.brickos.io/r/shi`. Requires DNS and SSL per org. More infrastructure.

## Consequences

**Easier:**
- Organizations have full control over their namespace
- No code collisions between organizations
- Clean URL hierarchy: `brickos.io/r/dfm/spring` is self-documenting
- Custom domains are just namespace aliases

**Harder:**
- Redirect handler must parse two URL patterns (single segment and two segments)
- Backward compatibility: legacy 10-char auto-codes still use global namespace
- QR codes and printed materials need the full path including org slug
- Reserved codes must be enforced at both global and org level
