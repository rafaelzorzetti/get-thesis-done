---
phase: 02-writing-pipeline-compilation
plan: 03
subsystem: CLI tools
tags: [citation, sanitization, validation, summary, figure-hook]
dependency_graph:
  requires: [02-01]
  provides: [cite-keys-cmd, sanitize-cmd, validate-citations-cmd, summary-extract-cmd, figure-hook]
  affects: [compile-pipeline, writing-workflows, review-workflows]
tech_stack:
  added: []
  patterns: [context-aware-escaping, protected-zone-placeholder, biblatex-citation-regex]
key_files:
  created: []
  modified: [get-thesis-done/bin/gtd-tools.js]
decisions:
  - Protected-zone placeholder approach for LaTeX sanitization (null-byte markers preserve command/math/comment zones during prose escaping)
  - Single biblatex regex covers all citation variants (cite, textcite, autocite, parencite, footcite, cites, starred, optional args)
  - SUMMARY.md template is write-once (never overwrites existing) to protect human edits
  - preProcessFigures() is intentionally a no-op returning {processed: 0, errors: []} for Phase 5
metrics:
  duration: 3m 1s
  completed: 2026-03-13
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 2 Plan 3: CLI Extensions (sanitize, cite-keys, validate-citations, summary extract) Summary

Context-aware LaTeX sanitization with protected zones, biblatex citation extraction and cross-validation, SUMMARY.md template scaffolding, and Phase 5 figure pre-processing hook -- all wired into the gtd-tools.js CLI router.

## What Was Done

### Task 1: Added sanitize and cite-keys commands

- **extractBibKeys(bibContent)**: Extracts citation keys from .bib content using `/@\w+\{([^,\s]+)/g` regex. Returns a Set.
- **cmdCiteKeys(cwd, raw)**: Reads `src/references.bib`, extracts keys via extractBibKeys, outputs sorted array. Supports both JSON and raw text output.
- **sanitizeLatex(content)**: Context-aware LaTeX sanitization using protected-zone placeholder approach:
  1. Identifies 6 types of protected zones (comments, display math, inline math, bracket math, commands with args, bare commands)
  2. Replaces protected zones with null-byte indexed placeholders
  3. Escapes `&`, `%`, `$`, `#`, `_` in prose (only if not already backslash-escaped)
  4. Restores protected zones from placeholders
- **countDifferences(a, b)**: Character-level diff counter for reporting sanitization changes.
- **cmdSanitize(cwd, chapter, raw)**: Finds chapter DRAFT.tex in `.planning/chapters/NN-slug/`, sanitizes it, writes back only if changes detected.
- Wired `cite-keys` and `sanitize` into CLI router switch statement.

### Task 2: Added validate-citations, summary extract, and figure hook

- **validateCitations(texContent, validKeys)**: Matches all biblatex citation commands (`\cite`, `\textcite`, `\autocite`, `\parencite`, `\footcite`, `\cites`, `\Cite`, `\Textcite`, starred variants, optional args) using single comprehensive regex. Handles multi-key citations (`\cite{k1,k2}`). Returns valid and invalid key lists.
- **cmdValidateCitations(cwd, chapter, raw)**: Cross-checks chapter DRAFT.tex citations against `src/references.bib`. Reports valid/invalid counts with position info for invalid keys.
- **cmdSummaryExtract(cwd, chapter, raw)**: Creates `NN-01-SUMMARY.md` template in chapter directory with structured sections (Key Arguments, Terms Introduced, Threads Advanced, Methodological Contributions, Citations Used, Connections, Open Threads). Refuses to overwrite existing files.
- **preProcessFigures(cwd)**: No-op hook returning `{processed: 0, errors: []}`. Called in `cmdCompile()` before latexmk execution, reserved for Phase 5 figure export pipeline.
- Replaced `summary` placeholder error with working `summary extract --chapter N` routing.
- Updated help text and file header to list all 8 commands.

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Protected-zone placeholder approach**: Used null-byte markers (`\0` + index + `\0`) to temporarily replace LaTeX commands, math, and comments before escaping prose characters. This avoids complex regex negative lookaheads and handles nested patterns correctly.
2. **Single comprehensive biblatex regex**: One pattern (`/\\(?:[Tt]ext|[Aa]uto|[Pp]aren|[Ff]oot)?[Cc]ite[sp]?\*?(?:\[[^\]]*\])*\{([^}]+)\}/g`) covers all standard biblatex citation commands including starred variants and optional arguments.
3. **Write-once SUMMARY.md**: Template creation is idempotent and non-destructive -- will not overwrite human-written summaries.
4. **Figure hook placement**: Inserted between output directory creation and latexmk execution in cmdCompile(), so Phase 5 can fail fast before expensive compilation.

## Verification Results

- `node -c get-thesis-done/bin/gtd-tools.js` -- syntax check passed
- All 8 functions present: extractBibKeys, cmdCiteKeys, sanitizeLatex, cmdSanitize, countDifferences, validateCitations, cmdValidateCitations, cmdSummaryExtract, preProcessFigures
- All 4 new router cases present: cite-keys, sanitize, validate-citations, summary
- Help text shows all 8 commands: init, progress, context, compile, cite-keys, sanitize, validate-citations, summary
- Figure hook call in cmdCompile() verified
- Zero new npm dependencies
- File: 1102 lines (388 lines added)

## Commits

| Hash | Message |
|------|---------|
| 42f08e2 | feat(02-03): add citation, sanitization, and summary CLI commands |

## Self-Check: PASSED

- FOUND: get-thesis-done/bin/gtd-tools.js
- FOUND: .planning/phases/02-writing-pipeline-compilation/02-03-SUMMARY.md
- FOUND: commit 42f08e2
