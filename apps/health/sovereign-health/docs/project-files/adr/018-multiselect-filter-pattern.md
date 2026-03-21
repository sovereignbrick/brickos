# ADR-018: MultiSelect Filter Pattern for Data Tables

**Status:** Accepted
**Date:** 2026-03-21

## Context
The measurements history page needed advanced filtering by multiple dimensions (device, lab, diet protocol, fasting protocol, marker). Native HTML `<select>` elements only support single selection and don't match the app's design system.

## Decision
Created a reusable `MultiSelect` component with:
- Checkbox-based multi-selection
- Optional search bar for long lists
- Consistent styling with the app's design system (bg-accent, border-border, focus:ring-2)
- Support for both dynamic options (from API) and static options (predefined protocols)
- URL parameter persistence for filter state

Backend supports comma-separated values in query parameters (e.g. `device_id=uuid1,uuid2`).

## Alternatives Considered
- **shadcn/ui Combobox:** Would require additional dependency setup. The custom component is simpler and tailored to our needs.
- **Native multi-select:** Poor UX, inconsistent cross-browser styling, doesn't support search.
- **Third-party library (react-select):** Heavy dependency for a simple use case.

## Consequences
- Consistent filter UX across all data tables
- Component is currently inline in measurements/page.tsx — should be extracted to a shared component
- Backend must parse comma-separated values for multi-value filters
- Saved as a BrickOS UI blueprint pattern for future projects
