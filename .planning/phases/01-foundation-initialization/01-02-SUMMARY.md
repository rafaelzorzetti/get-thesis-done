---
phase: 01-foundation-initialization
plan: 02
subsystem: templates
tags: [templates, latex, canonical-documents, abnTeX2, biblatex]
dependency_graph:
  requires: []
  provides: [canonical-document-templates, latex-templates, abntex2-config, requirements-txt]
  affects: [new-thesis-workflow, writing-pipeline, compilation-pipeline]
tech_stack:
  added: [abnTeX2, biblatex-abnt, biber, lmodern, microtype]
  patterns: [custom-placeholder-syntax, contrastive-glossary, chapter-contracts, methodological-arc]
key_files:
  created:
    - get-thesis-done/templates/framework.md
    - get-thesis-done/templates/style-guide.md
    - get-thesis-done/templates/structure.md
    - get-thesis-done/templates/figures.md
    - get-thesis-done/templates/main.tex
    - get-thesis-done/templates/chapter.tex
    - get-thesis-done/templates/references.bib
    - latex-templates/abntex2/abntex2-config.tex
    - requirements.txt
  modified: []
decisions:
  - "ABNT-style biblatex configuration uses noslsn and uniquename=init options for proper author disambiguation"
  - "abntex2-config.tex is optional import -- main.tex works standalone without it"
  - "Chapter templates use H3 headings (no Parts layer) matching thesis structure vs book structure"
  - "Methodological Arc tracking added to STRUCTURE.md as thesis-specific addition not present in GWD"
metrics:
  duration: "4m 46s"
  completed: "2026-03-13"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 0
requirements_completed: [FOUND-03, FOUND-04, FOUND-05, INIT-02, INIT-03, INIT-05, INIT-06, CANON-01, CANON-02, CANON-03]
---

# Phase 01 Plan 02: Canonical Document Templates and LaTeX Templates Summary

Thesis template set with 4 canonical documents (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md, FIGURES.md) adapted from GWD patterns for academic context, plus compilable abnTeX2 LaTeX templates using biblatex+biber with {{PLACEHOLDER}} custom template engine syntax.

## What Was Done

### Task 1: Canonical Document Templates (51c260f)

Created four canonical document templates in `get-thesis-done/templates/`:

**FRAMEWORK.md** -- Adapted from GWD's bible.md for thesis context. Includes:
- Thesis Statement section (replaces "Thesis" -- same concept, academic framing)
- Glossary with contrastive "NOT This" column (critical for preventing LLM semantic drift)
- Research Positions table tracking argumentative commitments
- Methodological Commitments table (NEW -- not in GWD, anchors methodology chapter)
- Continuity Map with Key Concepts, Arguments (Progressive Thread), and Open Questions
- Changelog tracking framework evolution across chapters
- Token budget and archival protocol comments preserved from GWD

**STYLE_GUIDE.md** -- Adapted from GWD's style-guide.md for academic writing. Includes:
- Voice Profile with academic register defaults (third person analysis, first person plural positioning)
- Academic Writing Patterns: Claim-Evidence-Analysis, hedging for precision, topic sentences, signposting
- Anti-Patterns: AI assistant tone suppression (CRITICAL), unsupported claims, informal register, listing
- Citation Style Rules (NEW -- not in GWD): direct quotation rules, paraphrase formatting, multiple authors
- Paragraph Rhythm adapted for academic prose (no "wall of theory" effect)
- Transition Patterns with banned connectors table
- Language Specifics placeholder for language-conditional content
- Calibration Passages (Target Voice + Anti-Voice)

**STRUCTURE.md** -- Adapted from GWD's outline.md for thesis structure. Includes:
- Thesis-Level Arc (replaces "Book-Level Arc")
- Chapter contracts at H3 level (no Parts layer -- theses are flatter than books)
- Each contract includes: Thesis, Key Points, Connections, Reserved/Do Not Touch, Methodology (NEW), Arc position, Target length
- Two example chapter entries with placeholder content
- Dependency Map for safe writing order
- Arc Tracking: Argumentative Arc + Methodological Arc (NEW -- tracks methods per chapter)

**FIGURES.md** -- Entirely new (not in GWD). Includes:
- Figures table with ID, Caption, Chapter, Type (excalidraw/tikz/static), Source File, Status
- Tables table tracked separately from figures
- Validation section documenting cross-reference checking rules

### Task 2: LaTeX Templates and Requirements (50f78c0)

**main.tex** -- Compilable abnTeX2 document template:
- Uses `\documentclass{abntex2}` with proper options (12pt, a4paper, oneside)
- biblatex+biber with `style=abnt` (requires biblatex-abnt package)
- {{PLACEHOLDER}} syntax for all customizable fields (thesis title, author, advisor, institution, etc.)
- Complete pre-textual structure (cover, title page, abstracts PT/EN, lists, TOC)
- Textual section with {{CHAPTER_INCLUDES}} placeholder
- Post-textual section with bibliography and optional appendices/annexes

**chapter.tex** -- Chapter stub template with section placeholders and labels.

**references.bib** -- Empty bibliography with BibLaTeX format header and example entry.

**abntex2-config.tex** -- Default abnTeX2 configuration in `latex-templates/abntex2/`:
- ABNT NBR 14724 spacing (1.5 line) and indentation (1.25cm)
- Commented-out optional configurations (captions, listings, math, color, glossary)
- Documented as optional import -- main.tex works without it

**requirements.txt** -- Python dependencies for v2 figure generation (matplotlib, SciencePlots, numpy).

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **biblatex-abnt options**: Used `noslsn` and `uniquename=init` for proper ABNT author disambiguation in citations.
2. **abntex2-config.tex as optional**: Made the config file an optional `\input{}` rather than mandatory, so main.tex works standalone.
3. **H3 chapter headings**: Confirmed thesis structure uses `### Chapter NN:` (H3) without Parts layer, matching plan specification.
4. **Methodological Arc**: Added to STRUCTURE.md as thesis-specific tracking not present in GWD -- tracks method, data/sources, and outputs per chapter.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 51c260f | Canonical document templates (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md, FIGURES.md) |
| Task 2 | 50f78c0 | LaTeX templates (main.tex, chapter.tex, references.bib), abntex2-config.tex, requirements.txt |

## Success Criteria Verification

1. Canonical document templates faithfully adapt GWD templates for academic thesis context -- PASS
2. FRAMEWORK.md template includes Methodological Commitments (new vs GWD) -- PASS
3. STYLE_GUIDE.md template includes Citation Style Rules (new vs GWD) -- PASS
4. STRUCTURE.md template uses H3 chapters (no Parts) with Methodology field per chapter -- PASS
5. main.tex uses biblatex+biber with style=abnt (not natbib) -- PASS
6. main.tex uses {{PLACEHOLDER}} custom template engine syntax -- PASS
7. All templates have {{PLACEHOLDER}} markers that the new-thesis workflow will fill -- PASS
8. FIGURES.md template tracks figures AND tables with validation rules -- PASS

## Self-Check: PASSED

All 9 created files verified present on disk. Both commit hashes (51c260f, 50f78c0) verified in git log.
