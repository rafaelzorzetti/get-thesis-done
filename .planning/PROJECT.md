# Get Thesis Done (GTD)

## What This Is

A multi-agent AI writing system for producing academic theses (undergraduate, master's, PhD) in LaTeX. Inspired by [Get Writing Done](https://github.com/rafaelzorzetti/get-writing-done), GTD orchestrates specialized agents through a structured pipeline — from thesis initialization to compiled PDF — while maintaining consistency across chapters, managing references (.bib + PDFs), generating figures (Excalidraw, Python, TikZ, Mermaid), and enforcing academic norms (ABNT, APA). Completely independent from GWD.

## Core Value

Academic rigor and consistency throughout the entire thesis — every chapter coherent with the theoretical framework, every citation validated against the .bib, every figure cataloged, and formatting norms enforced automatically.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-agent pipeline for thesis writing (plan → write → review per chapter)
- [ ] Canonical document system (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md)
- [ ] LaTeX output with configurable template (abnTeX2 default + custom university templates)
- [ ] Multi-language support (configurable per thesis)
- [ ] Reference management (.bib import from Zotero export, PDF metadata extraction fallback)
- [ ] Figure management (catalog, generation, export pipeline)
- [ ] Figure types: Excalidraw, Python (matplotlib/plotly), TikZ/PGF, Mermaid, static images
- [ ] Academic reviewer with 4 check categories: citations, methodological rigor, argumentative coherence, formatting norms
- [ ] LaTeX compilation (pdflatex + bibtex) with figure pre-processing pipeline
- [ ] Thesis levels: graduation, master's, PhD (affects rigor, extension, requirements)
- [ ] npm distribution for /gtd:* commands + pip for Python figure scripts
- [ ] Progress dashboard

### Out of Scope

- Zotero API integration — .bib file export is sufficient and universal
- Online/cloud compilation (Overleaf-style) — local pdflatex only
- Docker compilation — user manages their own TeX Live/MiKTeX installation
- Presentation slides generation — thesis document only
- Plagiarism detection — outside scope of writing tool

## Context

### Base Architecture (from GWD)

GTD adapts the proven GWD multi-agent architecture:

**3 Canonical Documents (adapted):**

| Document | Purpose |
|----------|---------|
| `FRAMEWORK.md` | Theoretical framework, glossary of technical terms, argumentative positions, continuity map (replaces GWD's BIBLE.md) |
| `STYLE_GUIDE.md` | Academic voice specification, citation style rules, anti-patterns, language calibration |
| `STRUCTURE.md` | Thesis structure: chapters, sections, contracts per chapter, dependencies (replaces GWD's OUTLINE.md) |

**7 Specialized Agents:**

| Agent | Role |
|-------|------|
| `planner` | Creates chapter beat sheet (sections, arguments, planned citations) |
| `writer` | Produces academic prose in LaTeX (Wave 1: structural, Wave 2: polish) |
| `reviewer` | Adversarial QA: citations, methodological rigor, argumentative coherence, formatting norms |
| `framework-keeper` | Updates FRAMEWORK.md after approved chapter (glossary, positions, threads) |
| `summary-writer` | Structured extraction for inter-chapter context chain |
| `reference-manager` | Manages .bib entries, validates citations, cross-references available PDFs |
| `figure-manager` | Manages figure catalog, generates diagrams, validates \ref{} references |

**9 Commands (/gtd:*):**

| Command | Function |
|---------|----------|
| `/gtd:new-thesis` | Initialize thesis project (deep questioning: topic, advisor, level, norm, language) |
| `/gtd:discuss-chapter N` | Pre-planning discussion |
| `/gtd:plan-chapter N` | Create beat sheet |
| `/gtd:write-chapter N` | Full pipeline (plan → wave1 → wave2) |
| `/gtd:review-chapter N` | Adversarial academic review |
| `/gtd:add-reference` | Add reference to .bib (from .bib import, PDF, DOI, or manual) |
| `/gtd:add-figure` | Add/generate figure (Excalidraw, Python, TikZ, Mermaid, static) |
| `/gtd:compile` | Compile LaTeX with figure pre-processing |
| `/gtd:progress` | Progress dashboard |

### Key Differences from GWD

1. **LaTeX output** — `\chapter{}`, `\section{}`, `\cite{}`, figure/table environments
2. **Reference management** — .bib integration, PDF collection, citation validation
3. **Figure pipeline** — catalog, multi-format generation, export pre-processing
4. **Academic norms** — ABNT/APA configurable, formatting enforcement
5. **Thesis levels** — graduation/master's/PhD affect rigor and requirements
6. **Multi-language** — configurable per thesis (PT-BR, EN, ES, etc.)
7. **Review categories** — academic-specific: citations, methodology, coherence, formatting

### Project Structure

```
get-thesis-done/
├── package.json
├── bin/
│   └── install.js                    # npm installer for /gtd:* commands
├── get-thesis-done/
│   ├── bin/
│   │   └── gtd-tools.js             # Core CLI utility (init, progress, context, compile)
│   ├── workflows/
│   │   ├── new-thesis.md            # Project initialization
│   │   ├── discuss-chapter.md       # Pre-planning discussion
│   │   ├── plan-chapter.md          # Beat sheet creation
│   │   ├── write-chapter.md         # Full writing pipeline
│   │   ├── review-chapter.md        # Academic review
│   │   ├── continuity-loop.md       # Post-review canonical update
│   │   ├── add-reference.md         # Reference management
│   │   ├── add-figure.md            # Figure management
│   │   └── compile.md               # LaTeX compilation
│   └── templates/
│       ├── framework.md             # FRAMEWORK.md template
│       ├── style-guide.md           # STYLE_GUIDE.md template
│       ├── structure.md             # STRUCTURE.md template
│       ├── main.tex                 # Main LaTeX template
│       └── chapter.tex              # Chapter LaTeX template
├── agents/
│   ├── planner.md
│   ├── writer.md
│   ├── reviewer.md
│   ├── framework-keeper.md
│   ├── summary-writer.md
│   ├── reference-manager.md
│   └── figure-manager.md
├── commands/gtd/
│   ├── new-thesis.md
│   ├── discuss-chapter.md
│   ├── plan-chapter.md
│   ├── write-chapter.md
│   ├── review-chapter.md
│   ├── add-reference.md
│   ├── add-figure.md
│   ├── compile.md
│   └── progress.md
├── hooks/
├── scripts/
│   └── figure-pipeline.py           # Figure export/generation scripts
├── latex-templates/
│   ├── abntex2/                     # Default ABNT template
│   └── custom/                      # User-provided templates
├── figures/
│   └── scripts/
│       └── plot_utils.py            # Shared Python utilities for figures
└── requirements.txt                 # Python dependencies (matplotlib, plotly, etc.)
```

### Reference & Figure Workflows

**Reference flow:**
1. User exports .bib from Zotero (primary flow)
2. OR user provides PDFs → system extracts metadata → generates .bib entries
3. OR user provides DOI → system fetches metadata → generates .bib entry
4. reference-manager validates all `\cite{}` in chapters against .bib
5. Cross-references PDFs in `references/` folder

**Figure flow:**
1. `/gtd:add-figure` → user specifies type + description
2. System generates source file (.excalidraw, .py, .mmd, .tikz)
3. Updates FIGURES.md catalog
4. On `/gtd:compile` → figure pipeline runs:
   - Python scripts → execute → PNG/PDF
   - Excalidraw → export → PDF
   - Mermaid → convert → PNG/PDF
   - TikZ → compiled inline by LaTeX
5. Validates all `\ref{fig:*}` have corresponding figures

## Constraints

- **Base**: GWD architecture (proven multi-agent pipeline) — adapted, not forked
- **Output**: LaTeX (.tex files), compiled to PDF via local pdflatex
- **Distribution**: npm package (commands) + pip requirements (Python figure scripts)
- **Independence**: Completely independent from GWD — no shared code or dependencies
- **Compilation**: Local TeX Live/MiKTeX — user's responsibility to install

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| abnTeX2 as default template | Most common for Brazilian academic work | — Pending |
| .bib file import (not Zotero API) | Universal, works with any reference manager | — Pending |
| Local pdflatex (not Docker) | Simpler, user manages TeX installation | — Pending |
| npm + pip distribution | npm for Claude Code commands, pip for Python figure scripts | — Pending |
| Multi-language support | Theses written in many languages globally | — Pending |
| 4 review categories | Citations + methodology + coherence + formatting = comprehensive academic QA | — Pending |

---
*Last updated: 2026-03-13 after initialization*
