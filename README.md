# GTD — Get Thesis Done

A complete thesis-writing pipeline powered by multi-agent AI for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

LaTeX-native output, ABNT/APA citation norms, adversarial academic review, and progressive chapter summaries keep every chapter consistent with your theoretical framework — from the first paragraph to the bibliography.

## How It Works

```
/gtd:new-thesis          →  Guided questioning + scaffolding (abnTeX2, biblatex, biber)
/gtd:discuss-chapter 1   →  Capture methodology, key refs, theoretical position
/gtd:plan-chapter 1      →  Beat-sheet PLAN.md from canonical context
/gtd:write-chapter 1     →  Multi-wave LaTeX generation (structure → polish)
/gtd:review-chapter 1    →  4-category adversarial review + framework update
/gtd:add-reference <DOI> →  Import references from DOI, .bib file, or PDF
/gtd:add-figure <id>     →  Register figures (Excalidraw, TikZ, static)
/gtd:compile             →  Pre-process figures + latexmk → PDF
/gtd:progress            →  Dashboard with chapter statuses and next action
```

## Architecture

The engine maintains three canonical documents that every agent references:

- **FRAMEWORK.md** — Theoretical framework, glossary, positions, continuity map, methodological commitments, changelog
- **STYLE_GUIDE.md** — Voice profile, sentence patterns, anti-patterns, academic writing rules, calibration passages
- **STRUCTURE.md** — Chapter structure, chapter contracts, dependency map, methodological arc tracking

Every agent receives `FRAMEWORK + STYLE + chapter summary` — never the full thesis. This keeps context short and consistent as the thesis grows.

### Pipeline

```
Planner → Writer (Wave 1: structure) → Writer (Wave 2: polish) → Reviewer → Framework-Keeper → Summary Writer
           ↑                                                        |              |
      human checkpoint                                        human checkpoint    auto
```

**7 specialized agents:**

| Agent | Role |
|-------|------|
| `planner` | Beat-sheet from STRUCTURE + canonical context |
| `writer` | LaTeX-native generation with persona override (no assistant tone) |
| `reviewer` | 4-category adversarial review: citation validity, methodological rigor, argumentative coherence, formatting norms |
| `framework-keeper` | Updates FRAMEWORK.md after chapter approval |
| `summary-writer` | Structured chapter summary feeding subsequent chapters |
| `reference-manager` | Cross-chapter citation validation and PDF tracking |
| `figure-manager` | Figure catalog management and validation |

### CLI Tools (gtd-tools.js)

```bash
# Thesis management
gtd-tools.js init                          # Scaffold thesis project (abnTeX2 + biblatex)
gtd-tools.js progress                      # Chapter status dashboard
gtd-tools.js context --chapter N           # Assemble canonical context bundle
gtd-tools.js compile [--clean]             # Pre-process figures + latexmk → PDF

# Writing support
gtd-tools.js cite-keys                     # List all citation keys from references.bib
gtd-tools.js sanitize --chapter N          # Escape LaTeX special characters in prose
gtd-tools.js validate-citations --chapter N # Cross-check \cite{} keys against .bib
gtd-tools.js summary extract --chapter N   # Create SUMMARY.md template
gtd-tools.js framework update --chapter N  # Update FRAMEWORK.md after review

# Reference management
gtd-tools.js import-bib --file path.bib   # Import entries from .bib file (deduplicates)
gtd-tools.js fetch-doi --doi 10.xxxx/...   # Fetch BibTeX from Crossref via DOI
gtd-tools.js pdf-meta --file path.pdf      # Extract DOI from PDF + fetch BibTeX
gtd-tools.js validate-refs                 # Cross-chapter citation validation
gtd-tools.js pdf-refs                      # Check which refs have local PDFs

# Figure management
gtd-tools.js register-figure --id <id> --type <excalidraw|tikz|static> --chapter N --caption "..."
gtd-tools.js validate-figs                 # Cross-reference figures vs FIGURES.md catalog
```

## Requirements

- **Node.js** >= 18
- **Claude Code** (or compatible AI coding assistant)
- **LaTeX** — texlive with abntex2, biblatex-abnt, biber

```bash
# Ubuntu/Debian
sudo apt-get install texlive-latex-extra texlive-publishers texlive-lang-portuguese texlive-bibtex-extra biber texlive-fonts-extra
```

## Installation

```bash
git clone https://github.com/rafaelzorzetti/get-thesis-done.git ~/.claude/get-thesis-done
```

The `/gtd:*` commands become available automatically in Claude Code when working in any directory.

## Quick Start

1. Open Claude Code in your thesis project directory
2. Run `/gtd:new-thesis` — answer questions about your topic, level (graduation/master's/PhD), language, and norms
3. The tool scaffolds: `main.tex`, `references.bib`, `FRAMEWORK.md`, `STRUCTURE.md`, `STYLE_GUIDE.md`, `FIGURES.md`, and chapter directories
4. Start writing: `/gtd:discuss-chapter 1` → `/gtd:plan-chapter 1` → `/gtd:write-chapter 1`
5. Review: `/gtd:review-chapter 1` (adversarial 4-category academic review)
6. Add references: `/gtd:add-reference 10.1186/s41239-019-0171-0`
7. Add figures: `/gtd:add-figure system-arch --type tikz --chapter 2 --caption "System architecture"`
8. Compile: `/gtd:compile` → PDF

## Features

- **LaTeX-native**: All output is `.tex` — no Markdown-to-LaTeX conversion
- **ABNT compliant**: abnTeX2 template, biblatex-abnt citations, Brazilian Portuguese support
- **Anti-hallucination**: Writer agent may only cite keys present in your `.bib` file; every `\cite{}` is validated
- **Figure pipeline**: Excalidraw → PDF export (via excalirender), TikZ inline compilation, static images
- **Zero runtime dependencies**: Node.js 18+ built-ins only

## Supported Norms

| Language | Default Norm | Template |
|----------|-------------|----------|
| pt-BR | ABNT (NBR 14724) | abnTeX2 |
| en | APA | abnTeX2 (configurable) |
| es | APA | abnTeX2 (configurable) |

## License

MIT
