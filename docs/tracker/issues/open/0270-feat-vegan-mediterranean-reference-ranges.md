---
number: 270
title: "feat: vegan + Mediterranean diet protocol reference ranges"
labels: [feat, backend, health-intelligence]
milestone: health-intelligence
---

## Description

Add diet-specific reference ranges for Vegan and Mediterranean protocols (Design 032, sections 3.3 and 3.4). Currently only Standard, Keto/Carnivore, and Fasting protocols have ranges.

## Vegan Protocol (standard_vegan)

| Marker | Change from Standard | Rationale |
|--------|---------------------|-----------|
| Vitamin B12 | Tighter lower bound | Vegans at high risk of B12 deficiency; require supplementation |
| Iron/Ferritin | Tighter lower bound | Plant-based iron (non-heme) has lower bioavailability |
| Vitamin D | Same as standard | Deficiency is diet-independent (sun exposure driven) |
| Omega-3 (EPA/DHA) | Tighter lower bound | No direct dietary EPA/DHA; must convert from ALA |
| Zinc | Tighter lower bound | Phytates in plant foods reduce zinc absorption |
| Homocysteine | Tighter upper bound | B12 deficiency elevates homocysteine |
| Total Protein/Albumin | Same as standard | Achievable on well-planned vegan diet |

## Mediterranean Protocol (standard_mediterranean)

| Marker | Change from Standard | Rationale |
|--------|---------------------|-----------|
| HDL | Higher floor expected | Olive oil + fish intake consistently raises HDL |
| Triglycerides | Tighter upper bound | Mediterranean diet should lower TG effectively |
| hs-CRP | Tighter upper bound | Anti-inflammatory dietary pattern |

## Requirements

- [ ] Migration: INSERT reference_ranges for standard_vegan (7 markers)
- [ ] Migration: INSERT reference_ranges for standard_mediterranean (3 markers)
- [ ] Update resolve_protocol_context() to map "vegan" -> "standard_vegan", "mediterranean" -> "standard_mediterranean"
- [ ] Update Design 032 with implemented status
- [ ] RC tests: verify vegan + mediterranean protocol ranges exist
- [ ] Needs MD review before production deploy

## References

- Design 032: Reference Ranges Protocol Impact
