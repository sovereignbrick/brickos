# Issue #296: Lab import does not recognize lab name and address

**Type:** bug
**Priority:** low
**Component:** backend / import / PDF extraction
**Found during:** v0.30.0-rc1 manual testing (2026-03-28)

## Description

When importing a lab PDF, the laboratory name and address are not extracted or recognized. This metadata could be useful for associating results with specific labs and for the Devices & Labs settings.

## Expected Behavior

The PDF extraction should attempt to identify and store the lab name and address from the document header/footer.

## Fix

Enhance the PDF extraction pipeline to look for common lab header patterns (name, address, accreditation number) and associate them with the import session.
