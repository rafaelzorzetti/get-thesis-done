---
phase: 04-reference-management
plan: 02
subsystem: reference-workflow-command
tags: [workflow, command, reference-management, auto-detection, validation]
dependency_graph:
  requires: [import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs]
  provides: [add-reference-workflow, gtd-add-reference-command]
  affects: [get-thesis-done/workflows/, commands/gtd/]
tech_stack:
  added: []
  patterns: [multi-mode-auto-detection, cli-orchestration, post-import-validation]
key_files:
  created:
    - get-thesis-done/workflows/add-reference.md
    - commands/gtd/add-reference.md
  modified: []
decisions:
  - Workflow does not spawn reference-manager agent for simple operations (CLI output is sufficient)
  - One source per invocation (batch via repeated calls, not batch mode)
  - Post-import validation runs automatically after every successful import/fetch/extract
  - Minimal PDF entries get explicit warning listing missing fields to complete
  - Orphaned bib entries reported as informational, not blocker
metrics:
  duration: 2m 18s
  completed: 2026-03-14T00:00:43Z
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 4 Plan 2: Add-Reference Workflow and Command Summary

Multi-mode reference import workflow with auto-detection (.bib/DOI/PDF), CLI delegation, post-import cross-chapter validation, and /gtd:add-reference command definition.

## What Was Built

### Task 1: Add-Reference Workflow (get-thesis-done/workflows/add-reference.md)

Created 341-line workflow following the exact structural pattern of review-chapter.md with all required sections:

**Sections:**
- `<purpose>`: Orchestrate reference addition from multiple sources
- `<core_principle>`: CLI commands do mechanical work, workflow orchestrates and presents
- `<terminology>`: Thesis-native terminology table (10 term mappings)
- `<process>`: 5-step sequential process
- `<constraints>`: No agent spawn for simple ops, one source at a time, never modifies .tex files
- `<error_handling>`: Recovery paths for all failure modes
- `<context_efficiency>`: ~20% context budget explanation

**Step 1 (Detect Input Mode):** Auto-detects 4 input patterns in priority order:
1. `.bib` extension --> import-bib mode
2. `10.\d{4,9}/` regex --> fetch-doi mode
3. `doi.org/` URL --> fetch-doi mode (strips URL prefix)
4. `.pdf` extension --> pdf-meta mode
5. Fallback: ask user via AskUserQuestion

Validates file existence for .bib and .pdf modes before proceeding.

**Step 2 (Execute Command):** Delegates to the correct CLI command with full error handling:
- import-bib: reports imported/skipped counts, lists skipped keys
- fetch-doi: shows fetched BibTeX, handles network/format errors with 3 suggestions
- pdf-meta: shows entry with DOI-found or minimal-entry-warning paths, handles missing poppler-utils

**Step 3 (Post-Import Validation):** Automatically runs both validation commands:
- validate-refs: reports missing citations per chapter, notes orphaned entries
- pdf-refs: reports N/M PDF availability, lists missing PDFs as informational

**Step 4 (Commit):** Commits references.bib if modified, skips commit for all-duplicate imports.

**Step 5 (Summary):** Presents mode, entries added, validation status, PDF availability, and next recommended action.

### Task 2: Command Definition (commands/gtd/add-reference.md)

Created 44-line command definition following the exact pattern of review-chapter.md:

- Frontmatter: name, description, argument-hint, allowed-tools (includes AskUserQuestion)
- Objective: describes purpose and context budget
- Execution context: `@~/.claude/get-thesis-done/workflows/add-reference.md`
- Context: passes `$ARGUMENTS` as source
- Process: 3-step delegation (execute workflow, workflow handles detection+import+validation, report results)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **No agent spawn for simple operations:** The workflow delegates entirely to CLI commands for import-bib, fetch-doi, and pdf-meta. The reference-manager agent is not spawned. This keeps context budget low (~20%) and response time fast.

2. **One source per invocation:** The workflow handles a single source argument. For batch imports, users run the command multiple times. This is simpler and fast enough for sequential use.

3. **Automatic post-import validation:** Both validate-refs and pdf-refs run after every successful import, giving the user immediate feedback on citation health.

4. **Minimal entry warning:** When pdf-meta creates a minimal entry (no DOI found), the workflow explicitly warns and lists the fields to complete (journal, volume, pages, doi).

5. **Orphaned entries as informational:** Entries in references.bib that are not cited in any chapter are reported but not flagged as errors -- they may be intended for future chapters.

## Verification Results

| Check | Result |
|-------|--------|
| Workflow file exists | PASS |
| Workflow references all 5 CLI commands (>= 5) | PASS (14 matches) |
| Workflow has 4 required sections | PASS |
| Command file exists | PASS |
| Command references gtd:add-reference | PASS |
| Command references workflow file | PASS |
| Command has 4 frontmatter fields | PASS |
| Command includes AskUserQuestion | PASS |
| No GWD terminology outside table | PASS |
| Workflow min 150 lines | PASS (341 lines) |

## Self-Check: PASSED

All files exist, all commits verified.
