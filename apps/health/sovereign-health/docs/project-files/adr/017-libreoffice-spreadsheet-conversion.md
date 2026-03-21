# ADR-017: LibreOffice for Spreadsheet-to-CSV Conversion

**Status:** Accepted
**Date:** 2026-03-21

## Context
The Smart Import feature allows users to upload ODS, XLSX, and XLS spreadsheet files containing measurement data. The backend needs to extract tabular data and send it to Claude AI for marker matching. Claude works best with CSV text, not binary spreadsheet formats.

## Decision
Install `libreoffice-calc` in the production Docker image and use `libreoffice --headless --convert-to csv` for spreadsheet conversion. The converted CSV is then sent to Claude for extraction.

Key implementation details:
- Use clean filenames (UUID-based, no spaces) to avoid path issues
- Configure UTF-8 output charset via LibreOffice filter string
- Handle multi-sheet files by auto-selecting the first sheet's CSV output
- Fall back to Latin-1 decoding if UTF-8 parsing fails
- API timeout set to 120s for Claude extraction of large spreadsheets

## Alternatives Considered
- **calamine crate (Rust native):** Would eliminate the LibreOffice dependency (~200MB in Docker image). Faster and more predictable. However, requires more code to handle all format quirks. Consider migrating in a future sprint.
- **Send raw file to Claude vision API:** Claude supports images and PDFs but not ODS/XLSX binary formats directly. Would only work for CSV or photo uploads.
- **Client-side conversion (SheetJS):** Would add complexity to the frontend and increase bundle size. Server-side is simpler and more secure.

## Consequences
- Docker image is ~200MB larger due to libreoffice-calc and dependencies
- External process spawning (libreoffice) adds latency (~2-5s per conversion)
- Multi-sheet files require directory scanning to find the correct output CSV
- LibreOffice is a well-tested, stable tool for format conversion
- Future: consider migrating to calamine for smaller image and faster conversion
