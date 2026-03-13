---
phase: 04-reference-management
plan: 01
subsystem: reference-management-cli
tags: [cli, references, bibtex, crossref, pdf-metadata]
dependency_graph:
  requires: []
  provides: [import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs, reference-manager-agent]
  affects: [gtd-tools.js, agents/]
tech_stack:
  added: [crossref-content-negotiation, poppler-utils-integration]
  patterns: [async-main, shared-fetch-helper, graduated-pdf-extraction]
key_files:
  created:
    - agents/reference-manager.md
  modified:
    - get-thesis-done/bin/gtd-tools.js
decisions:
  - fetchBibtexFromDoi extracted as shared async helper for both fetch-doi and pdf-meta commands
  - appendBibEntry creates parent directory if missing (defensive for fresh projects)
  - pdf-meta gracefully degrades: DOI found -> Crossref fetch -> fetch fails -> minimal entry; no DOI -> minimal entry
  - constructMinimalBibEntry generates unique keys using author-year + filename hash fallback
  - validate-refs picks latest draft revision (DRAFT-r2 > DRAFT-r1 > DRAFT) for each chapter directory
metrics:
  duration: 4m 44s
  completed: 2026-03-13T23:54:50Z
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 4 Plan 1: CLI Extensions and Reference-Manager Agent Summary

5 new reference management CLI commands (import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs) added to gtd-tools.js with async main(), shared Crossref fetch helper, and reference-manager agent definition for thesis-level validation.

## What Was Built

### Task 1: Synchronous CLI Commands (import-bib, validate-refs, pdf-refs)

**Functions added:**
- `extractBibEntries(bibContent)` -- Full BibTeX entry extraction with balanced brace tracking, skipping @comment/@preamble/@string special entries
- `appendBibEntry(bibPath, entryText)` -- Safe .bib file appending with directory creation, blank-line separation, and re-read verification
- `cmdImportBib(cwd, filePath, raw)` -- REF-01: Imports entries from external .bib files with key-based deduplication
- `cmdValidateRefs(cwd, raw)` -- REF-04: Scans both src/chapters/ and .planning/chapters/ for citations, reports missing/orphaned keys
- `cmdPdfRefs(cwd, raw)` -- REF-05: Cross-references bib keys against PDF filenames in src/references/

**Key behaviors:**
- import-bib resolves relative and absolute paths, reports imported/skipped counts
- validate-refs picks latest draft revision per chapter directory (highest -rN wins)
- pdf-refs matches case-insensitively and handles missing src/references/ directory gracefully

### Task 2: Async CLI Commands (fetch-doi, pdf-meta) and Agent

**Functions added:**
- `checkSystemDep(command)` -- System command availability check via `which`
- `extractDOIFromPdf(pdfPath)` -- Graduated DOI extraction: pdfinfo metadata then pdftotext first 2 pages
- `constructMinimalBibEntry(pdfPath)` -- Fallback BibTeX entry from PDF metadata/filename
- `fetchBibtexFromDoi(doi)` -- Shared async helper: DOI normalization, Crossref fetch with Accept: application/x-bibtex, content-type validation, HTML fallback detection
- `cmdFetchDoi(cwd, doi, raw)` -- REF-02: DOI to BibTeX via Crossref content negotiation
- `cmdPdfMeta(cwd, filePath, raw)` -- REF-03: PDF metadata extraction with graceful degradation chain

**Infrastructure changes:**
- `main()` converted to `async function main()` with `.catch()` error handler
- All existing sync commands unchanged (no `await` needed for sync code)

**Agent created:**
- `agents/reference-manager.md` with thesis-level validation role, 5-step process (CLI validation, .bib completeness, key conventions, actionable report, CLI suggestions), what-you-never-do/what-you-always-do sections, terminology table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] appendBibEntry parent directory creation**
- **Found during:** Task 1 smoke test
- **Issue:** appendBibEntry failed with ENOENT when src/ directory did not exist (fresh project without `init` run)
- **Fix:** Added `fs.mkdirSync(parentDir, { recursive: true })` before file creation
- **Files modified:** get-thesis-done/bin/gtd-tools.js
- **Commit:** c81a13a

## Decisions Made

1. **fetchBibtexFromDoi as shared helper:** Extracted the core DOI fetch logic into a standalone async function rather than duplicating it in cmdFetchDoi and cmdPdfMeta. Both commands call this helper, and cmdPdfMeta falls back to minimal entry if the fetch fails.

2. **Defensive directory creation:** appendBibEntry creates the parent directory if it doesn't exist, making import-bib usable on projects that haven't run `init` yet.

3. **Graduated PDF extraction with fallback chain:** pdf-meta tries pdfinfo metadata first, then pdftotext text scan. If DOI is found, it tries Crossref. If Crossref fails, it falls back to a minimal entry. If no DOI is found at all, it constructs a minimal entry. This ensures the command always produces a result.

4. **Unique key generation for minimal entries:** constructMinimalBibEntry generates keys from first-author-lastname + year, with a filename-hash fallback for unknown authors to avoid key collisions.

5. **Latest draft revision selection:** validate-refs sorts draft files by revision number descending and uses only the highest revision, matching the project convention (DRAFT.tex < DRAFT-r1.tex < DRAFT-r2.tex).

## Verification Results

| Check | Result |
|-------|--------|
| Syntax check (node -c) | PASS |
| All 14 commands in help text | PASS |
| import-bib deduplication | PASS (1 imported, then 0 imported / 1 skipped) |
| validate-refs smoke test | PASS (reports 0 chapters, 1 orphaned entry) |
| pdf-refs smoke test | PASS (reports missing directory, 1 entry without PDF) |
| Function count increase | PASS (28 -> 39, +11 new functions) |
| async main() with .catch() | PASS |
| reference-manager.md exists | PASS |
| Zero new npm dependencies | PASS |

## Self-Check: PASSED

All files exist, all commits verified.
