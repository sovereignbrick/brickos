# Data Governance Act -- Compliance Assessment

**Regulation:** Regulation (EU) 2022/868 on European data governance (Data Governance Act)
**Effective date:** 24 September 2023
**Last reviewed:** 2026-04-05
**Next review:** 2027-04-01 (annual re-evaluation)
**Status:** Not Applicable
**Reviewer:** Platform Lead

## 1. Applicability

The Data Governance Act establishes frameworks for:
1. **Re-use of public sector data** (Chapter II) -- conditions for reusing protected data held by public bodies
2. **Data intermediation services** (Chapter III) -- regulation of entities that mediate data sharing between data holders and data users
3. **Data altruism** (Chapter IV) -- framework for organizations that collect data for general interest purposes

BrickOS does not fall under any of these categories:

- [ ] Applies directly
- [ ] Applies indirectly (through supply chain, sector rules)
- [x] Does not apply (with reasoning)

**Reasoning:**

- **Not a data intermediary:** BrickOS does not facilitate data sharing between parties. Users store their own health data for their own personal use. There is no marketplace, exchange, or brokering function.
- **Not a data altruism organization:** BrickOS does not collect user data for general interest or research purposes. Users retain full control of their data.
- **Not re-using public sector data:** BrickOS does not access or re-use data held by EU public bodies.
- **Organization sharing (ADR 031):** The multi-tenant organization feature allows users within an organization to share data by explicit consent. This is user-directed sharing within a single platform, not data intermediation as defined by Art. 10. The platform does not act as a neutral intermediary between independent data holders and data users.

## 2. Requirements Mapping

Not applicable. No requirements to map.

## 3. Gaps

No gaps -- regime does not apply.

## 4. Evidence Index

| Control | Evidence Type | Location | Last Verified |
|---|---|---|---|
| No data intermediation function | Architecture review | Platform stores individual user data only | 2026-04-05 |
| Organization sharing is user-directed | ADR | ADR 031 (`adr/031-organizations-multi-tenant.md`) | 2026-04-05 |

## 5. Review History

| Date | Reviewer | Changes | Next Review |
|---|---|---|---|
| 2026-04-05 | Platform Lead | Initial assessment; classified as not applicable | 2027-04-01 |
