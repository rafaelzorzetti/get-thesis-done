# Requirements: Get Thesis Done (GTD)

**Defined:** 2026-03-13
**Core Value:** Academic rigor and consistency throughout the entire thesis — every chapter coherent with the theoretical framework, every citation validated, formatting norms enforced automatically.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: System installs as npm package with `/gtd:*` commands for Claude Code
- [ ] **FOUND-02**: `gtd-tools.js` CLI provides init, progress, context assembly, and compile commands
- [ ] **FOUND-03**: LaTeX template system supports abnTeX2 as default with custom university template override
- [ ] **FOUND-04**: Thesis language is configurable per project (PT-BR, EN, ES, etc.)
- [ ] **FOUND-05**: Package distributes via npm (commands) + pip requirements.txt (Python figure dependencies)

### Initialization

- [ ] **INIT-01**: `/gtd:new-thesis` conducts deep questioning about topic, level, advisor, norms, language, structure
- [ ] **INIT-02**: System scaffolds FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md from templates based on author's answers
- [ ] **INIT-03**: System generates `main.tex` and chapter `.tex` stubs from LaTeX template
- [ ] **INIT-04**: Thesis level (graduation/master's/PhD) is recorded and affects rigor expectations and review criteria
- [ ] **INIT-05**: System creates `references.bib` and `references/` directory for PDFs
- [ ] **INIT-06**: System creates `figures/` directory structure and `FIGURES.md` catalog

### Canonical Documents

- [ ] **CANON-01**: FRAMEWORK.md tracks theoretical framework, glossary of technical terms, argumentative positions, and continuity map
- [ ] **CANON-02**: STYLE_GUIDE.md specifies academic voice, citation style rules (ABNT/APA), anti-patterns, and language calibration
- [ ] **CANON-03**: STRUCTURE.md defines thesis structure with chapter contracts, section dependencies, and arc tracking
- [ ] **CANON-04**: Canonical documents serve as single source of truth for all agents via context assembly

### Writing Pipeline

- [ ] **WRITE-01**: `/gtd:discuss-chapter N` captures locked decisions before planning via CONTEXT.md
- [ ] **WRITE-02**: `/gtd:plan-chapter N` spawns planner agent to create beat sheet (PLAN.md) with sections, arguments, and planned citations
- [ ] **WRITE-03**: `/gtd:write-chapter N` orchestrates plan → Wave 1 (structural draft in LaTeX) → Wave 2 (polished prose in LaTeX)
- [ ] **WRITE-04**: Writer agent produces LaTeX-native output (`\chapter{}`, `\section{}`, `\cite{}`, figure/table environments)
- [ ] **WRITE-05**: Writer agent operates in persona mode (academic author, not AI assistant) with anti-pattern suppression
- [ ] **WRITE-06**: Each agent spawns with fresh context window and loads canonical context via `gtd-tools.js context --chapter N`
- [ ] **WRITE-07**: `/gtd:progress` displays thesis progress dashboard with chapter statuses and next recommended action

### Academic Review

- [ ] **REVIEW-01**: `/gtd:review-chapter N` spawns reviewer agent with adversarial stance
- [ ] **REVIEW-02**: Reviewer checks citation validity — every key argument has `\cite{}`, every `\cite{}` exists in .bib
- [ ] **REVIEW-03**: Reviewer checks methodological rigor — consistency with methodology chapter, appropriate methods for claims
- [ ] **REVIEW-04**: Reviewer checks argumentative coherence — logical continuity across chapters, theoretical framework respected
- [ ] **REVIEW-05**: Reviewer checks formatting norms — ABNT/APA compliance, LaTeX structure, margins, spacing
- [ ] **REVIEW-06**: Review supports up to 2 revision cycles before forcing author decision
- [ ] **REVIEW-07**: Approved chapters trigger continuity loop — framework-keeper updates FRAMEWORK.md, summary-writer fills SUMMARY.md

### Reference Management

- [ ] **REF-01**: `/gtd:add-reference` imports entries from existing .bib file (Zotero/Mendeley export)
- [ ] **REF-02**: `/gtd:add-reference` fetches BibTeX from DOI via Crossref REST API
- [ ] **REF-03**: `/gtd:add-reference` extracts metadata from PDF files and generates .bib entries
- [ ] **REF-04**: Reference-manager agent validates all `\cite{}` in chapters against `references.bib`
- [ ] **REF-05**: System cross-references cited keys with available PDFs in `references/` directory

### Figure Management

- [ ] **FIG-01**: `/gtd:add-figure` creates and registers figures in FIGURES.md catalog
- [ ] **FIG-02**: System supports Excalidraw figures (`.excalidraw` → exported to PDF/PNG)
- [ ] **FIG-03**: System supports TikZ/PGF figures (LaTeX-native, compiled inline)
- [ ] **FIG-04**: FIGURES.md tracks: ID, caption, chapter, type, source, status
- [ ] **FIG-05**: System validates all `\ref{fig:*}` have corresponding figures in catalog

### Compilation

- [ ] **COMP-01**: `/gtd:compile` runs latexmk with pdflatex + biber for multi-pass compilation
- [ ] **COMP-02**: Compilation pre-processes figure pipeline (Excalidraw export) before LaTeX build
- [ ] **COMP-03**: Compilation reports errors with actionable diagnostics (not raw LaTeX log)
- [ ] **COMP-04**: LaTeX special character sanitization catches common unescaped characters (`_`, `%`, `&`)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Figure Types

- **FIG-V2-01**: Python figure generation (matplotlib/plotly scripts → PNG/PDF)
- **FIG-V2-02**: Mermaid diagram support (.mmd → PNG/PDF via mmdc)
- **FIG-V2-03**: Figure generation from natural language description

### Distribution

- **DIST-V2-01**: Support for OpenCode and Gemini CLI (multi-runtime installer)

### Advanced References

- **REF-V2-01**: Zotero API direct integration
- **REF-V2-02**: Automatic related work suggestion based on thesis topic

### Review

- **REV-V2-01**: Plagiarism similarity check against reference PDFs
- **REV-V2-02**: Statistical analysis validation for quantitative theses

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud/online compilation (Overleaf-style) | Local pdflatex only — user manages TeX installation |
| Docker compilation | Adds complexity; local TeX Live is sufficient |
| Presentation slides generation | Thesis document only |
| Plagiarism detection service | Outside scope of writing tool |
| Real-time collaboration | Single-author workflow |
| Literature search/discovery | User provides their own references |
| Visual LaTeX editor | CLI tool, not an IDE |
| Grammar/spell checking | Handled by user's editor |
| One-click full thesis generation | Human-in-the-loop by design |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | — |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 0
- Unmapped: 35

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after initial definition*
