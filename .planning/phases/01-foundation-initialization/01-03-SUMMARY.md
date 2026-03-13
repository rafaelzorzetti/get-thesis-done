---
phase: 01-foundation-initialization
plan: 03
subsystem: workflows-and-commands
tags: [workflow, commands, new-thesis, progress, compile, slash-commands, initialization]
dependency_graph:
  requires: [gtd-tools-cli, canonical-document-templates, latex-templates]
  provides: [new-thesis-workflow, gtd-new-thesis-command, gtd-progress-command, gtd-compile-command]
  affects: [user-initialization-experience, chapter-writing-pipeline, compilation-pipeline]
tech_stack:
  added: []
  patterns: [deep-questioning-flow, one-at-a-time-population, dual-track-scaffolding, thesis-native-terminology, actionable-error-diagnostics]
key_files:
  created:
    - get-thesis-done/workflows/new-thesis.md
    - commands/gtd/new-thesis.md
    - commands/gtd/progress.md
    - commands/gtd/compile.md
  modified: []
decisions:
  - "Thesis-native terminology enforced in all author-facing output (chapter not phase, research question not core value, advisor not stakeholder)"
  - "Compilation verification step added to initialization workflow (not present in GWD) to catch LaTeX setup issues early"
  - "Deep questioning covers 12 academic areas vs GWD's 6 general areas (added: level, advisor, institution, norms, methodology, timeline, existing references)"
  - "Compile command includes 7 common LaTeX error patterns with actionable fix suggestions"
metrics:
  duration: "4m 27s"
  completed: "2026-03-13"
  tasks_completed: 2
  tasks_total: 3
  files_created: 4
  files_modified: 0
requirements_completed: [INIT-01, CANON-04]
---

# Phase 01 Plan 03: Workflows and Commands Summary

/gtd:new-thesis workflow with 7-step deep questioning flow (12 academic areas) scaffolding dual-track directories via gtd-tools.js, populating templates one-at-a-time, and verifying LaTeX compilation. Supporting /gtd:progress thesis dashboard and /gtd:compile with actionable error diagnostics.

## What Was Done

### Task 1: New-Thesis Workflow and Command (7f6040c)

**get-thesis-done/workflows/new-thesis.md** (385 lines) -- Complete initialization workflow adapted from GWD's new-book.md for academic thesis context. Seven-step process:

1. **Validate** -- Check for existing FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md (warn on overwrite). Verify git initialization.

2. **Deep Questioning** -- Opens with "What is your thesis about?" then follows threads naturally. Covers 12 areas:
   - Research topic and question (knowledge gap, existing literature)
   - Thesis level (TCC/Master's/PhD -- affects rigor and word count)
   - Advisor and co-advisor (research group, area of expertise)
   - Institution (university, department, city)
   - Academic norms (ABNT/APA/IEEE, specific version)
   - Language (PT-BR/EN/ES, bilingual requirements)
   - Methodology (qualitative/quantitative/mixed, theoretical framework)
   - Structure (chapter count, progression, discipline-specific variations)
   - Key terms (technical terms needing rigorous definitions)
   - Boundaries (explicit exclusions, acknowledged limitations)
   - Existing references (.bib from Zotero/Mendeley)
   - Timeline (defense deadline, qualification exam)

   Background readiness check for FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md, and main.tex population readiness. Decision gate via AskUserQuestion with "Create the project" / "Keep exploring" loop.

3. **Scaffold** -- Runs `gtd-tools.js init --language {lang} --level {level}` to create dual-track structure (.planning/ + src/). Full verification of all created files and directories.

4. **Populate Templates** -- One-at-a-time population (7 sub-steps):
   - 4a: FRAMEWORK.md (thesis statement, glossary with contrastive definitions, research positions)
   - 4b: STYLE_GUIDE.md (academic voice profile, citation rules, language specifics)
   - 4c: STRUCTURE.md (thesis-level arc, chapter contracts, dependency map, methodological arc)
   - 4d: main.tex (all {{PLACEHOLDER}} values replaced -- title, author, advisor, institution, language, chapters)
   - 4e: Chapter stubs (src/chapters/NN-slug.tex from template + .planning/chapters/ directories)
   - 4f: FIGURES.md (thesis title, empty catalog)
   - 4g: thesis.json verification (level, language, norm, created date)

5. **Verify Compilation** -- NEW step not in GWD. Attempts test build via `gtd-tools.js compile`. Diagnoses common issues (missing packages, encoding, babel mismatch). Gracefully handles missing latexmk.

6. **Commit** -- Stages and commits all populated files.

7. **Report** -- Thesis-specific summary with next steps (/gtd:discuss-chapter, /gtd:progress, /gtd:compile).

Includes terminology table enforcing thesis-native terms and comprehensive "what NOT to do" section.

**commands/gtd/new-thesis.md** -- Slash command entry point referencing the workflow and all 8 template files in execution_context (framework.md, style-guide.md, structure.md, figures.md, main.tex, chapter.tex, references.bib).

### Task 2: Progress and Compile Commands (0165c60)

**commands/gtd/progress.md** -- Thesis-aware progress dashboard:
- Runs `gtd-tools.js progress` for chapter data (JSON)
- Reads FRAMEWORK.md for thesis title, thesis.json for level/language/norm
- Displays: header with thesis metadata, visual progress bar, chapter table (number, title, status, coverage), current position, next action recommendation
- Next action maps status to appropriate /gtd:* command (plan-chapter, write-chapter, review-chapter, or "Thesis complete!")

**commands/gtd/compile.md** -- LaTeX compilation with actionable diagnostics:
- Wraps `gtd-tools.js compile` with `--clean` flag support
- Success path shows PDF location and warning count
- Failure path matches 7 common error patterns with specific fix instructions:
  - Undefined control sequence (missing package)
  - Missing $ inserted (math mode)
  - File not found (missing \include target)
  - No \citation commands (empty .bib)
  - Babel unknown option (language mismatch)
  - Emergency stop (critical syntax error)
  - Undefined environment (missing package)
- Missing latexmk path provides installation instructions for Ubuntu/Debian, macOS, and TeX Live direct download

### Task 3: Human Verification Checkpoint

Not executed -- awaiting human review of all Phase 1 artifacts.

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Thesis-native terminology**: Enforced throughout all author-facing content. Added "Literature review/Background research" and "Methodology/Implementation plan" to terminology table beyond GWD's original set.
2. **Compilation verification**: Added as Step 5 in the workflow (between template population and commit). GWD's new-book.md does not have this step -- it is thesis-specific because LaTeX compilation failures are common and catching them early is critical.
3. **12 questioning areas**: Expanded from GWD's 6 areas (core thesis, reader, tone/voice, structure, key terms, boundaries) to 12 thesis-specific areas (adding: level, advisor, institution, norms, methodology, existing references, timeline).
4. **7 LaTeX error patterns**: Compile command includes actionable diagnostics for the most common LaTeX build failures, with specific fix suggestions rather than raw log output.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 7f6040c | New-thesis workflow (385 lines) and /gtd:new-thesis command |
| Task 2 | 0165c60 | /gtd:progress and /gtd:compile commands |

## Success Criteria Verification

1. new-thesis workflow conducts deep questioning covering all INIT-01 areas (topic, level, advisor, norms, language, structure) -- PASS (12 areas covered)
2. Workflow scaffolds via gtd-tools.js init and populates all canonical documents + LaTeX files -- PASS (Steps 3 and 4)
3. Thesis level and language are persisted in .planning/thesis.json (INIT-04, FOUND-04) -- PASS (Step 4g verifies)
4. Chapter stubs are generated in src/chapters/ (INIT-03) -- PASS (Step 4e)
5. references.bib and references/ directory are created (INIT-05) -- PASS (verified in Step 3)
6. figures/ directory and FIGURES.md are created (INIT-06) -- PASS (Steps 3 and 4f)
7. Canonical documents serve as context assembly source (CANON-04) -- PASS (populated documents are single source of truth)
8. /gtd:progress shows chapter statuses with next action -- PASS (progress.md)
9. /gtd:compile invokes latexmk compilation -- PASS (compile.md)
10. No GWD references in output files -- PASS (0 matches across all 4 files)

## Self-Check: PASSED

All 4 created files verified present on disk. Both commit hashes (7f6040c, 0165c60) verified in git log.
