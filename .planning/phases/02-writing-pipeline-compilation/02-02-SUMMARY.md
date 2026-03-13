---
phase: 02-writing-pipeline-compilation
plan: 02
subsystem: writing-pipeline-workflows
tags: [workflows, commands, discuss-chapter, plan-chapter, write-chapter, latex, citation-validation, thesis-adaptation]
dependency_graph:
  requires: [02-01]
  provides: [discuss-chapter-workflow, plan-chapter-workflow, write-chapter-workflow, gtd-discuss-chapter-cmd, gtd-plan-chapter-cmd, gtd-write-chapter-cmd]
  affects: [02-03, 03-01]
tech_stack:
  added: []
  patterns: [thesis-native-terminology, latex-output, citation-validation-fallback, src-chapters-copy, direct-git-commits, agent-context-isolation]
key_files:
  created:
    - get-thesis-done/workflows/discuss-chapter.md
    - get-thesis-done/workflows/plan-chapter.md
    - get-thesis-done/workflows/write-chapter.md
    - commands/gtd/discuss-chapter.md
    - commands/gtd/plan-chapter.md
    - commands/gtd/write-chapter.md
  modified: []
decisions:
  - "Discuss-chapter workflow adds 5 thesis-specific discussion areas: methodology, key references, theoretical position, research question connection, data/evidence sources"
  - "Write-chapter Step 6 citation validation uses CLI with fallback to grep when validate-citations not yet available"
  - "Write-chapter Step 8 copies DRAFT.tex to src/chapters/NN-slug.tex bridging writing pipeline to compilation pipeline"
  - "Discuss-chapter does not use Task tool (conversational workflow); plan-chapter and write-chapter use Task for agent spawning"
  - "All workflows use direct git add/commit instead of phantom CLI commit wrapper"
metrics:
  duration: 5m 36s
  completed: 2026-03-13
---

# Phase 2 Plan 02: Chapter Workflows and Commands Summary

Create the three chapter workflows (discuss-chapter, plan-chapter, write-chapter) and their /gtd:* slash commands, adapted from GWD for thesis/LaTeX context.

## One-liner

Three chapter workflows (discuss/plan/write) with thesis discussion areas, planned citations display, LaTeX two-wave pipeline, citation validation, and src/chapters/ compilation bridge.

## What Was Done

### Task 1: Create discuss-chapter and plan-chapter workflows and commands

Created 4 files adapting GWD workflows for thesis context:

**get-thesis-done/workflows/discuss-chapter.md** (~280 lines):
1. Thesis-specific discussion areas added: methodological approach, key references (.bib keys), theoretical position, research question connection, data/evidence sources
2. "Stories or examples" replaced with "Evidence and examples"; opening/closing notes thesis chapters can start with problem statements
3. CONTEXT.md output includes methodological scope in domain section, optional "Key references" subsection in decisions
4. All terminology swaps: OUTLINE.md to STRUCTURE.md, BIBLE.md to FRAMEWORK.md, gwd-tools.js to gtd-tools.js, /gwd:* to /gtd:*
5. Direct git commit commands (not gwd-tools.js commit wrapper)
6. Thesis-native terminology table (Thesis/Book, Advisor/Editor)

**get-thesis-done/workflows/plan-chapter.md** (~270 lines):
1. Prerequisites check: has_framework, has_style, has_structure (not has_bible/has_outline)
2. Error messages direct to /gtd:new-thesis (not /gwd:new-book)
3. Plan approval displays thesis-specific fields: planned citations per section, methodology per section, methodological arc position
4. Direct git commit commands
5. Next steps report: /gtd:write-chapter N or /gtd:discuss-chapter N

**commands/gtd/discuss-chapter.md**: Slash command with AskUserQuestion (no Task tool -- conversational workflow)
**commands/gtd/plan-chapter.md**: Slash command with Task tool for planner agent spawning

### Task 2: Create write-chapter workflow and command

Created 2 files:

**get-thesis-done/workflows/write-chapter.md** (~470 lines):
1. Full 8-step pipeline: Initialize -> Spawn Planner -> Plan Checkpoint -> Wave 1 .tex -> Wave 2 .tex -> Citation Validation -> Draft Checkpoint -> Finalize
2. Wave 1 and Wave 2 output as .tex (not .md) -- writer agent produces LaTeX-native content
3. Step 2 checks for existing PLAN.md and offers reuse (if /gtd:plan-chapter already ran)
4. Step 6 citation validation: attempts gtd-tools.js validate-citations, falls back to grep extraction of \cite{} keys against references.bib
5. Step 7 draft checkpoint includes citation warnings and academic anti-pattern scan
6. Step 8 finalize: sanitize (graceful fallback), copy DRAFT.tex to src/chapters/NN-slug.tex (CRITICAL compilation bridge), verify main.tex \include{}, summary template scaffold (graceful fallback), git commit
7. Exactly 2 checkpoints: after plan and after Wave 2 + citation validation
8. All CLI commands from Plan 02-03 (sanitize, validate-citations, summary extract) wrapped in 2>/dev/null with graceful fallback

**commands/gtd/write-chapter.md**: Slash command with Task tool, references full pipeline and compilation copy

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| f35b79a | feat(02-02): create chapter workflows and commands for thesis pipeline | 6 files (3 workflows + 3 commands) |

## Verification Results

| Check | Result |
|-------|--------|
| All 6 files exist | PASS |
| Zero stale GWD references | PASS (0 matches across all files) |
| Write-chapter references .tex output | PASS (DRAFT-w1.tex, DRAFT.tex) |
| Citation validation present | PASS (15 occurrences) |
| Commands reference correct workflow paths | PASS (all 3 commands) |
| Workflows reference gtd-tools.js | PASS (all 3 workflows) |
| Write-chapter copies to src/chapters/ | PASS |

## Self-Check: PASSED

All 6 files exist, commit f35b79a verified.
