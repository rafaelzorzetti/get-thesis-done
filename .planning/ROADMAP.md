# Roadmap: Get Thesis Done (GTD)

**Created:** 2026-03-13
**Granularity:** Standard
**Phases:** 5
**Coverage:** 43/43 v1 requirements mapped

## Phases

- [x] **Phase 1: Foundation & Initialization** - Installable package that scaffolds a compilable, empty ABNT-compliant LaTeX thesis with canonical documents
- [x] **Phase 2: Writing Pipeline & Compilation** - Plan chapters, generate LaTeX drafts in two waves, and compile to PDF
- [x] **Phase 3: Academic Review & Continuity** - Adversarial 4-category review with continuity loop for cross-chapter coherence
- [x] **Phase 4: Reference Management** - Import, fetch, and validate references from .bib, DOI, and PDF sources
- [ ] **Phase 5: Figure Management** - Create, catalog, and validate figures with pre-compilation export pipeline

## Phase Details

### Phase 1: Foundation & Initialization
**Goal**: A user can install GTD, run `/gtd:new-thesis`, and receive a fully scaffolded, compilable LaTeX thesis project with canonical documents configured for their topic, level, language, and norms
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, INIT-01, INIT-02, INIT-03, INIT-04, INIT-05, INIT-06, CANON-01, CANON-02, CANON-03, CANON-04
**Success Criteria** (what must be TRUE):
  1. User runs `npx get-thesis-done` and gets `/gtd:*` commands available in Claude Code
  2. User runs `/gtd:new-thesis`, answers questions about topic/level/language/norms, and receives a scaffolded project with FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md, main.tex, chapter stubs, references.bib, and figures/ directory
  3. The scaffolded empty LaTeX project compiles to a structurally correct PDF with abnTeX2 (or custom template) without errors
  4. Thesis level (graduation/master's/PhD) and language configuration are persisted and affect downstream behavior
  5. `gtd-tools.js` CLI responds to init, progress, context, and compile subcommands
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md -- Package infrastructure (package.json, install.js) and gtd-tools.js CLI
- [x] 01-02-PLAN.md -- Canonical document templates and LaTeX templates
- [x] 01-03-PLAN.md -- /gtd:new-thesis workflow, /gtd:progress, and /gtd:compile commands

### Phase 2: Writing Pipeline & Compilation
**Goal**: A user can plan a chapter, generate a complete LaTeX draft through the two-wave writing process, and compile the thesis to PDF -- producing their first real chapter
**Depends on**: Phase 1
**Requirements**: WRITE-01, WRITE-02, WRITE-03, WRITE-04, WRITE-05, WRITE-06, WRITE-07, COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. User runs `/gtd:discuss-chapter N` and captures locked decisions in CONTEXT.md before planning begins
  2. User runs `/gtd:plan-chapter N` and receives a structured beat sheet (PLAN.md) with sections, arguments, and planned citations
  3. User runs `/gtd:write-chapter N` and gets a LaTeX chapter file produced through Wave 1 (structural draft) and Wave 2 (polished prose), with proper `\chapter{}`, `\section{}`, `\cite{}`, and figure/table environments
  4. User runs `/gtd:compile` and gets a compiled PDF, with actionable error diagnostics (not raw LaTeX log) and LaTeX special character sanitization applied automatically
  5. User runs `/gtd:progress` and sees a dashboard showing chapter statuses and the next recommended action
**Plans:** 3 plans
Plans:
- [x] 02-01-PLAN.md -- Agent adaptations (planner.md + writer.md for thesis/LaTeX) and extractChapterStructure() regex fix
- [x] 02-02-PLAN.md -- Workflows and commands (discuss-chapter, plan-chapter, write-chapter)
- [x] 02-03-PLAN.md -- CLI extensions (sanitize, cite-keys, validate-citations, summary extract) and compilation figure hook

### Phase 3: Academic Review & Continuity
**Goal**: Each chapter passes a rigorous 4-category academic review, and approved chapters automatically update canonical documents to maintain cross-chapter coherence throughout the thesis
**Depends on**: Phase 2
**Requirements**: REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04, REVIEW-05, REVIEW-06, REVIEW-07
**Success Criteria** (what must be TRUE):
  1. User runs `/gtd:review-chapter N` and receives an adversarial review covering all 4 categories: citation validity, methodological rigor, argumentative coherence, and formatting norms compliance
  2. Every `\cite{}` in a reviewed chapter is validated against references.bib -- missing or invalid citations are flagged
  3. After up to 2 revision cycles, the user is forced to make a final decision (approve or defer)
  4. When a chapter is approved, FRAMEWORK.md is automatically updated (glossary, positions, continuity map) and SUMMARY.md is generated for the inter-chapter context chain
**Plans:** 2 plans
Plans:
- [x] 03-01-PLAN.md -- Agent adaptations (reviewer.md with 4 thesis categories, framework-keeper.md, summary-writer.md)
- [x] 03-02-PLAN.md -- Workflows, command, and CLI (review-chapter + continuity-loop workflows, /gtd:review-chapter command, framework update CLI)

### Phase 4: Reference Management
**Goal**: Users can build and maintain their references.bib from multiple sources, with validation ensuring every citation in the thesis resolves to a real entry
**Depends on**: Phase 2 (citation validation in writing pipeline)
**Requirements**: REF-01, REF-02, REF-03, REF-04, REF-05
**Success Criteria** (what must be TRUE):
  1. User runs `/gtd:add-reference` with an existing .bib file and entries are imported into references.bib
  2. User runs `/gtd:add-reference` with a DOI and the system fetches BibTeX metadata from Crossref and adds it to references.bib
  3. User runs `/gtd:add-reference` with a PDF file and the system extracts metadata to generate a .bib entry
  4. Reference-manager validates all `\cite{}` keys across all chapters against references.bib and reports mismatches
  5. System reports which cited references have corresponding PDFs in the `references/` directory and which do not
**Plans:** 2 plans
Plans:
- [x] 04-01-PLAN.md -- CLI extensions (import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs) and reference-manager agent
- [x] 04-02-PLAN.md -- add-reference workflow and /gtd:add-reference command

### Phase 5: Figure Management
**Goal**: Users can create, catalog, and manage thesis figures with automatic reference validation, and the compilation pipeline pre-processes figure exports before building the PDF
**Depends on**: Phase 2 (compilation pipeline hook for figure pre-processing)
**Requirements**: FIG-01, FIG-02, FIG-03, FIG-04, FIG-05
**Success Criteria** (what must be TRUE):
  1. User runs `/gtd:add-figure` and a figure is created and registered in FIGURES.md with ID, caption, chapter, type, source, and status
  2. Excalidraw figures (.excalidraw files) are exported to PDF/PNG during the compilation pre-processing step
  3. TikZ/PGF figures compile inline within the LaTeX build without additional pre-processing
  4. All `\ref{fig:*}` in the thesis are validated against the FIGURES.md catalog -- orphaned references are flagged
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Initialization | 3/3 | Complete | 2026-03-13 |
| 2. Writing Pipeline & Compilation | 3/3 | Complete | 2026-03-13 |
| 3. Academic Review & Continuity | 2/2 | Complete | 2026-03-13 |
| 4. Reference Management | 2/2 | Complete | 2026-03-14 |
| 5. Figure Management | 0/? | Not started | - |

---
*Roadmap created: 2026-03-13*
*Last updated: 2026-03-14 after Phase 4 Plan 02 execution*
