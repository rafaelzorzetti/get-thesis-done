---
phase: 03-academic-review-continuity
plan: 02
subsystem: review-continuity-workflows
tags: [workflows, review-chapter, continuity-loop, framework-update, CLI, thesis-pipeline]
dependency_graph:
  requires: [03-01]
  provides: [review-chapter-workflow, continuity-loop-workflow, review-chapter-command, framework-update-cli]
  affects: []
tech_stack:
  added: []
  patterns: [review-then-continuity-chaining, sequential-agent-dependency, cli-backup-before-agent, revision-cycle-cap]
key_files:
  created:
    - get-thesis-done/workflows/review-chapter.md
    - get-thesis-done/workflows/continuity-loop.md
    - commands/gtd/review-chapter.md
  modified:
    - get-thesis-done/bin/gtd-tools.js
decisions:
  - "Review workflow enforces max 2 revision cycles with forced author decision after (approve, edit, or rewrite)"
  - "Continuity-loop runs framework-keeper FIRST then summary-writer SECOND in strict sequential order"
  - "CLI framework update creates backup via copyFileSync, updates frontmatter, appends changelog row before framework-keeper agent runs"
  - "/gtd:review-chapter command chains review-chapter workflow then continuity-loop on approval"
  - "Terminology tables retain old terms (BIBLE.md, gwd-tools, etc.) in NOT This column as intentional negative examples (same pattern as Phase 2 and 03-01)"
  - "All draft paths use .tex extension: DRAFT.tex, DRAFT-r1.tex, DRAFT-r2.tex (LaTeX-native pipeline)"
  - "Direct git add/commit in workflows (Phase 2 decision -- no phantom CLI wrapper)"
metrics:
  duration: 6m 37s
  completed: 2026-03-13
---

# Phase 3 Plan 02: Workflows, Command, and CLI Summary

Create the review-chapter and continuity-loop workflows, /gtd:review-chapter command, and CLI framework update -- completing the full review pipeline from user invocation through canonical document updates.

## One-liner

Review-chapter workflow with 2-cycle revision cap spawning reviewer agent; continuity-loop with strict framework-keeper-then-summary-writer ordering; /gtd:review-chapter command chaining both; cmdFrameworkUpdate CLI creating backup, updating frontmatter, appending changelog.

## What Was Done

### Task 1: Create review-chapter workflow and /gtd:review-chapter command

**Part A: get-thesis-done/workflows/review-chapter.md** (577 lines, adapted from GWD's 517 lines):

1. **5-step workflow:** Initialize (validate DRAFT.tex exists, set revision_count=0, max_revisions=2) -> Spawn reviewer agent via Task() from agents/reviewer.md -> Review checkpoint (present 4 category breakdown, critical/minor findings) -> Revision cycle (spawn writer in Wave 2 mode with failed_checks) -> Finalize (copy to src/chapters/, git commit)

2. **Revision cycle with cap:** revision_count tracks cycles, max_revisions=2 enforced. After 2 cycles: forced decision (approve, edit manually, rewrite). DRAFT-r1.tex and DRAFT-r2.tex produced by revisions. If approved after revision, canonical DRAFT.tex updated with approved version.

3. **Category breakdown in checkpoint:** Presents all 4 thesis categories (citation_validity, methodological_rigor, argumentative_coherence, formatting_norms) with per-category pass/fail counts at the review checkpoint.

4. **Finalization copies to src/chapters/:** Approved DRAFT.tex copied to src/chapters/NN-slug.tex for compilation pipeline, matching write-chapter workflow pattern.

5. **Terminology swaps applied throughout:** FRAMEWORK.md (not BIBLE.md), STRUCTURE.md (not OUTLINE.md), DRAFT.tex (not DRAFT.md), gtd-tools.js, get-thesis-done, /gtd:*. Old terms retained in terminology table's "NOT This" column.

**Part B: commands/gtd/review-chapter.md** (48 lines):

1. **Frontmatter:** name: gtd:review-chapter, argument-hint: "<chapter-number>", allowed-tools include Task and AskUserQuestion for subagent spawning and author interaction.

2. **Chaining logic:** Executes review-chapter workflow end-to-end, then checks status. If "approved": displays message and chains to continuity-loop workflow. If not approved: reports status without chaining.

3. **References:** Both workflow paths in execution_context (@~/.claude/get-thesis-done/workflows/review-chapter.md, @~/.claude/get-thesis-done/workflows/continuity-loop.md).

### Task 2: Implement CLI framework update and create continuity-loop workflow

**Part A: gtd-tools.js framework update command** (cmdFrameworkUpdate function, ~90 lines):

1. **Validation:** Checks --chapter argument exists, validates chapter number is a positive integer.

2. **Backup:** Creates .planning/FRAMEWORK.md.bak via fs.copyFileSync (always overwrites -- latest backup only).

3. **Frontmatter update:** Uses extractFrontmatter/spliceFrontmatter to set `updated_after: "Ch NN"` and `last_updated: "YYYY-MM-DD"`.

4. **Changelog append:** Finds ## Changelog section, counts pipe characters in header row for column safety, appends placeholder row: `| Ch NN | YYYY-MM-DD | [Updated after chapter NN completion -- review needed] |`. Handles both empty tables and tables with existing rows.

5. **CLI router update:** Case 'framework' now parses subcommand 'update' and routes to cmdFrameworkUpdate with --chapter flag parsing. Error message updated to "Usage: framework update --chapter N".

6. **Output:** JSON with chapter, backup path, updated_after, last_updated. Raw mode outputs human-readable string.

**Part B: get-thesis-done/workflows/continuity-loop.md** (447 lines, adapted from GWD's 360 lines):

1. **8-step workflow:** Initialize (validate review approved) -> Create SUMMARY.md template (CLI scaffold) -> CLI backup (framework update --chapter N) -> Spawn framework-keeper FIRST -> Spawn summary-writer SECOND -> Git commit -> Verify progressive chain -> Report completion.

2. **Strict agent ordering:** Framework-keeper MUST complete before summary-writer starts. Summary-writer depends on updated FRAMEWORK.md for cross-referencing vocabulary, thread states, and concept status.

3. **CLI backup before agent:** Step 3 runs `gtd-tools.js framework update --chapter N` to create FRAMEWORK.md.bak and update frontmatter/changelog BEFORE the framework-keeper agent modifies content.

4. **Review gate enforcement:** Step 1 validates that REVIEW.md exists and chapter was approved. Refuses to run on unapproved chapters to prevent FRAMEWORK.md corruption.

5. **Chain verification:** Step 7 runs context assembly for next chapter to verify progressive chain includes the new summary.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 4bb4bc9 | feat(03-02): create review-chapter workflow and command | get-thesis-done/workflows/review-chapter.md, commands/gtd/review-chapter.md |
| b34c440 | feat(03-02): implement framework update CLI and continuity-loop workflow | get-thesis-done/bin/gtd-tools.js, get-thesis-done/workflows/continuity-loop.md |

## Verification Results

| Check | Result |
|-------|--------|
| review-chapter workflow exists | PASS |
| review-chapter command exists | PASS |
| Revision cycle tracking (max_revisions/revision_count) | PASS (19 references) |
| Spawns reviewer agent | PASS |
| Uses .tex draft paths | PASS |
| Stale GWD refs in review-chapter workflow (terminology only) | PASS (6 refs, all in terminology table) |
| Command chains to continuity loop | PASS |
| review-chapter workflow line count >= 300 | PASS (577 lines) |
| Framework command responds with usage | PASS |
| continuity-loop workflow exists | PASS |
| Spawns framework-keeper agent | PASS |
| Spawns summary-writer agent | PASS |
| Invokes CLI backup (framework update) | PASS |
| Stale GWD refs in continuity-loop (terminology only) | PASS (6 refs, all in terminology table) |
| cmdFrameworkUpdate function exists | PASS |
| Creates backup (copyFileSync) | PASS |
| continuity-loop line count >= 200 | PASS (447 lines) |

## Self-Check: PASSED

All files exist, all commits verified, cmdFrameworkUpdate present in gtd-tools.js.
