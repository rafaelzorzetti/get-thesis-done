---
phase: 02-writing-pipeline-compilation
plan: 01
subsystem: writing-pipeline-agents
tags: [agents, planner, writer, latex, thesis-adaptation, regex-fix]
dependency_graph:
  requires: [01-02]
  provides: [thesis-planner-agent, thesis-writer-agent, fixed-chapter-extraction]
  affects: [02-02, 02-03]
tech_stack:
  added: []
  patterns: [thesis-native-terminology, latex-output, academic-persona, planned-citations, methodological-arc]
key_files:
  created: []
  modified:
    - agents/planner.md
    - agents/writer.md
    - get-thesis-done/bin/gtd-tools.js
decisions:
  - "Terminology table in planner.md retains old terms in 'NOT This' column as reference -- these are intentional negative examples, not stale references"
  - "Writer anti-patterns adapted for academic context: Hedge->Weak Hedge, Balance->False Balance, Teacher->Textbook"
  - "extractChapterStructure() lookahead changed to '### Chapter \\d' for precise chapter boundary matching"
metrics:
  duration: 5m 49s
  completed: 2026-03-13
---

# Phase 2 Plan 01: Agent Adaptation Summary

Rewrite planner and writer agents from GWD book/Markdown mode to GTD thesis/LaTeX mode, and fix the H4-to-H3 regex bug in extractChapterStructure().

## One-liner

Thesis-adapted planner with planned citations and methodological arc; LaTeX writer with academic persona and formal register; H3 regex fix for STRUCTURE.md extraction.

## What Was Done

### Task 1: Rewrite agents/planner.md

Completely rewrote the planner agent (from ~307 lines GWD to ~280 lines GTD) with:

1. **Terminology swap:** BIBLE.md to FRAMEWORK.md, OUTLINE.md to STRUCTURE.md, gwd-tools.js to gtd-tools.js, get-writing-done to get-thesis-done, has_bible to has_framework, has_outline to has_structure, /gwd:* to /gtd:*, DRAFT.md to DRAFT.tex
2. **Planned citations:** Added `planned_citations` field to frontmatter and per-section `Planned citations` field; key arguments include cite hints (`\cite{silva2023}`)
3. **Citation validation:** New Step 3 in context_assembly reads references.bib keys; rule enforces all planned citations must reference real .bib keys or use `[CITATION NEEDED: topic]` marker
4. **Methodology tracking:** Added per-section `Methodology` field describing the research method
5. **Methodological Arc Position:** Added new section at end of beat sheet format specifying where the chapter sits in the thesis's methodological progression
6. **Direct git commits:** Replaced phantom `gwd-tools.js commit` with `git add` + `git commit` commands
7. **Thesis-native terminology table:** Updated from book-native to thesis-native (Chapter/Phase, Thesis/Book, Advisor/Editor, Research question/Core value, FRAMEWORK.md/BIBLE.md, STRUCTURE.md/OUTLINE.md)

### Task 2: Rewrite agents/writer.md + Fix extractChapterStructure()

**Part A: Writer agent** -- Completely rewrote (from ~371 lines GWD to ~340 lines GTD) with:

1. **LaTeX output:** Wave 1 produces `NN-01-DRAFT-w1.tex`, Wave 2 produces `NN-01-DRAFT.tex`; output uses `\chapter{}`, `\section{}`, `\label{}`, `\cite{}`, `\textcite{}`, figure/table environments
2. **Academic persona:** Replaced conversational book author with formal academic researcher; third person, impersonal constructions, evidence-based hedging for precision (not weakness)
3. **Adapted anti-patterns:**
   - The Hedge became "The Weak Hedge" (distinguishes from precision hedging)
   - The Signpost (unchanged but with academic examples)
   - The Balance became "The False Balance" (academic writing takes evidence-based positions)
   - The Teacher became "The Textbook" (thesis argues, does not teach)
   - The Summarizer (unchanged but academic: end with implications, not recaps)
4. **Wave 2 additions:** Citation key verification against PLAN.md, LaTeX environment checks, special character checks, label/ref consistency
5. **Portuguese BR examples:** All rewritten for academic register (statistical evidence, \textcite{} integration, formal constructions)
6. **Direct git commits:** Same fix as planner -- no phantom CLI

**Part B: extractChapterStructure() regex fix** in get-thesis-done/bin/gtd-tools.js line 468-475:
- Changed `#### Chapter` to `### Chapter` matching STRUCTURE.md H3 format
- Updated lookahead from `\\n####|\\n###|\\n##` to `\\n### Chapter \\d|\\n## ` for precise boundary detection

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 0455af4 | feat(02-01): adapt planner and writer agents for thesis/LaTeX pipeline | agents/planner.md, agents/writer.md, get-thesis-done/bin/gtd-tools.js |

## Verification Results

| Check | Result |
|-------|--------|
| Zero stale GWD refs in writer.md | PASS (0 matches) |
| Stale refs in planner.md only in terminology table | PASS (2 matches in "NOT This" column only) |
| FRAMEWORK.md references in planner.md | PASS |
| DRAFT.tex output paths in writer.md | PASS |
| LaTeX \chapter command in writer.md | PASS |
| H3 regex in gtd-tools.js | PASS |
| Planned citations in planner.md | PASS |
| Methodology tracking in planner.md | PASS |

## Self-Check: PASSED

All files exist, all commits verified.
