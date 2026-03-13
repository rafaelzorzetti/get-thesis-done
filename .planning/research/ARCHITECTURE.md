# Architecture Patterns

**Domain:** Multi-agent AI-powered academic thesis writing system
**Researched:** 2026-03-13
**Overall confidence:** HIGH (derived from working GWD implementation + LaTeX ecosystem documentation)

## Recommended Architecture

GTD follows a **sequential pipeline with human-in-the-loop** architecture, adapted from the proven GWD (Get Writing Done) multi-agent book-writing system. The core pattern is: orchestrator workflows coordinate specialized subagents, each running in isolated 200K context windows. Canonical documents maintain cross-chapter consistency. The thesis user's project directory is the single source of truth.

### High-Level System Diagram

```
User (Author)
    |
    v
/gtd:* Commands (slash commands -> workflow dispatch)
    |
    v
Workflows (orchestrators, ~10-15% context budget)
    |
    +--spawn--> Subagents (planner, writer, reviewer, etc.)
    |               |
    |               +--read/write--> Thesis Project Directory
    |               |                    |
    |               |                    +-- .planning/
    |               |                    |     +-- FRAMEWORK.md (canonical)
    |               |                    |     +-- STYLE_GUIDE.md (canonical)
    |               |                    |     +-- STRUCTURE.md (canonical)
    |               |                    |     +-- chapters/NN-slug/
    |               |                    |           +-- PLAN.md, DRAFT.tex, REVIEW.md, SUMMARY.md
    |               |                    |
    |               |                    +-- src/
    |               |                    |     +-- main.tex
    |               |                    |     +-- chapters/*.tex
    |               |                    |     +-- references.bib
    |               |                    |     +-- figures/ (generated outputs)
    |               |                    |
    |               |                    +-- figures/
    |               |                    |     +-- sources/ (.excalidraw, .py, .mmd, .tikz)
    |               |                    |     +-- FIGURES.md (catalog)
    |               |                    |
    |               |                    +-- references/
    |               |                          +-- *.pdf (source PDFs)
    |               |
    |               +--exec--> gtd-tools.js (CLI utility)
    |
    +--exec--> Figure Pipeline (Python + Node.js export tools)
    |
    +--exec--> LaTeX Compilation (latexmk -> pdflatex + bibtex)
    |
    v
Output: thesis.pdf
```

### Component Boundaries

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **Commands** (`commands/gtd/*.md`) | Slash command definitions, argument parsing, workflow dispatch | Workflows | Markdown + YAML frontmatter |
| **Workflows** (`get-thesis-done/workflows/*.md`) | Orchestrate multi-step pipelines, manage checkpoints, spawn agents | Agents, CLI tools, User | Markdown instructions for Claude Code |
| **Agents** (`agents/*.md`) | Specialized task execution (planning, writing LaTeX, reviewing, etc.) | Canonical docs, chapter files, CLI tools | Markdown system prompts |
| **CLI Tools** (`get-thesis-done/bin/gtd-tools.js`) | File scaffolding, context assembly, progress tracking, compilation orchestration | File system, external tools (latexmk, python, mmdc) | Node.js |
| **Canonical Documents** (`.planning/FRAMEWORK.md`, `STYLE_GUIDE.md`, `STRUCTURE.md`) | Single source of truth for thesis consistency | Read by all agents | Markdown with YAML frontmatter |
| **LaTeX Source** (`src/`) | The actual thesis output -- .tex files, .bib, compiled PDF | Written by writer agent, read by reviewer, compiled by CLI | LaTeX (abnTeX2 default) |
| **Figure Pipeline** (`figures/sources/` + `scripts/figure-pipeline.py`) | Convert source diagrams to LaTeX-includable formats | CLI tools, LaTeX compiler | Python + Node.js tools |
| **Reference Manager** (agent + `.bib` file + `references/` PDFs) | Citation validation, .bib management, PDF cross-referencing | Writer agent (validates \cite{}), .bib file | BibTeX format |
| **Templates** (`get-thesis-done/templates/`, `latex-templates/`) | Starting points for canonical docs and LaTeX structure | CLI init command | Markdown + LaTeX |

### Data Flow

```
INITIALIZATION FLOW:
  /gtd:new-thesis -> deep questioning -> populate canonical docs
    -> scaffold LaTeX project (main.tex, chapter templates, .bib)
    -> git init + first commit

CHAPTER WRITING FLOW (per chapter):
  /gtd:plan-chapter N
    -> workflow reads STRUCTURE.md chapter entry
    -> spawns planner agent (fresh 200K window)
       -> planner reads: canonical context bundle (FRAMEWORK + STYLE_GUIDE + chapter entry + prior summaries)
       -> planner produces: .planning/chapters/NN-slug/NN-01-PLAN.md
    -> human checkpoint: approve plan

  /gtd:write-chapter N
    -> workflow spawns writer agent (Wave 1: structural draft)
       -> writer reads: PLAN.md + canonical context
       -> writer produces: .planning/chapters/NN-slug/NN-01-DRAFT-w1.tex (LaTeX)
    -> workflow spawns writer agent (Wave 2: polish)
       -> writer reads: Wave 1 draft + STYLE_GUIDE.md + canonical context
       -> writer produces: .planning/chapters/NN-slug/NN-01-DRAFT.tex (final LaTeX)
    -> human checkpoint: approve draft
    -> copies approved .tex to src/chapters/chNN.tex

  /gtd:review-chapter N
    -> workflow spawns reviewer agent
       -> reviewer reads: draft .tex + PLAN.md + canonical context
       -> reviewer produces: .planning/chapters/NN-slug/NN-01-REVIEW.md
       -> 4 academic check categories: citations, methodology, coherence, formatting
    -> human checkpoint: approve, fix, or skip findings
    -> if fix: spawn writer with review instructions -> re-review (max 2 cycles)

  CONTINUITY LOOP (after review passes):
    -> workflow spawns framework-keeper agent
       -> reads approved draft, updates FRAMEWORK.md (glossary, positions, threads)
    -> workflow spawns summary-writer agent
       -> reads approved draft, fills SUMMARY.md (structured extraction)
    -> verifies progressive context chain for next chapter

REFERENCE FLOW:
  /gtd:add-reference
    -> input: .bib file import | PDF file | DOI | manual entry
    -> reference-manager agent validates/creates .bib entry
    -> updates src/references.bib
    -> optionally copies PDF to references/

FIGURE FLOW:
  /gtd:add-figure
    -> input: type (excalidraw|python|tikz|mermaid|static) + description
    -> figure-manager agent generates source file
    -> updates figures/FIGURES.md catalog

COMPILATION FLOW:
  /gtd:compile
    -> figure pipeline pre-processing:
       -> Python scripts (.py) -> execute -> PNG/PDF output
       -> Excalidraw (.excalidraw) -> excalirender/export CLI -> PDF/SVG
       -> Mermaid (.mmd) -> mmdc -> PNG/PDF
       -> TikZ (.tikz) -> inline in LaTeX (no pre-processing)
       -> static images -> copy to output directory
    -> LaTeX compilation:
       -> latexmk -pdf src/main.tex
       -> (internally: pdflatex -> bibtex -> makeindex -> pdflatex x2)
    -> output: src/thesis.pdf
```

## Patterns to Follow

### Pattern 1: Orchestrator-Agent Isolation (from GWD)

**What:** Workflows stay at 10-15% context budget. They never read full chapter drafts or canonical documents. Agents are spawned via Task() with fresh 200K windows and read their own context.

**When:** Every workflow-to-agent interaction.

**Why for GTD specifically:** LaTeX chapters are verbose (lots of markup). Loading a .tex draft into the orchestrator context would waste context budget on `\begin{figure}`, `\cite{}` markup, etc. Let agents handle the markup in their own windows.

**Example:**
```
Task(
  prompt="
    First, read agents/writer.md for your role.
    <wave>1</wave>
    <chapter>3</chapter>
    <chapter_dir>.planning/chapters/03-fundamentacao</chapter_dir>
    <plan_path>.planning/chapters/03-fundamentacao/03-01-PLAN.md</plan_path>
    <output_path>.planning/chapters/03-fundamentacao/03-01-DRAFT.tex</output_path>
  ",
  description="Write Chapter 3 (Wave 1: Structure)"
)
```

### Pattern 2: Canonical Context Bundle Assembly (from GWD)

**What:** A CLI command (`gtd-tools.js context --chapter N`) assembles the exact context an agent needs: FRAMEWORK.md + STYLE_GUIDE.md + STRUCTURE.md chapter entry + prior chapter summaries. Agents call this themselves.

**When:** Before any agent starts work on a chapter.

**Why for GTD specifically:** Academic theses have additional canonical context compared to books -- the theoretical framework, glossary of technical terms, and citation requirements all need to travel with each agent call. The context bundle ensures no agent writes without awareness of established terminology and methodological positions.

**Adaptation from GWD:**
- BIBLE.md -> FRAMEWORK.md (theoretical framework, glossary, argumentative positions, continuity map)
- OUTLINE.md -> STRUCTURE.md (chapter contracts, dependencies, arc tracking)
- STYLE_GUIDE.md -> STYLE_GUIDE.md (academic voice, citation patterns, anti-patterns, language calibration)

### Pattern 3: Progressive Summary Chain (from GWD)

**What:** Each chapter, after passing review, produces a structured SUMMARY.md. These summaries form the progressive context chain -- each subsequent chapter receives all prior summaries to maintain continuity.

**When:** After every chapter review gate passes.

**Why for GTD specifically:** Thesis chapters build arguments progressively. Chapter 3 (Theoretical Framework) establishes terms that Chapter 4 (Methodology) must use consistently. The summary chain prevents the common AI failure of redefining established concepts or contradicting prior arguments.

**Token budget consideration:** Target ~3,000 tokens per FRAMEWORK.md, hard max 5,000. Archive resolved items when approaching limits.

### Pattern 4: Two-Wave Writing (from GWD)

**What:** Wave 1 produces structural draft (arguments in correct sections), Wave 2 polishes prose and enforces style. No human checkpoint between waves.

**When:** Every chapter write cycle.

**Why for GTD specifically:** Academic writing has distinct structure and prose concerns. Wave 1 ensures the methodology section actually discusses methodology and citations are placed correctly. Wave 2 ensures academic voice consistency, eliminates AI anti-patterns (hedging, signposting), and validates Portuguese BR quality. The LaTeX output format makes this separation even cleaner -- Wave 1 focuses on `\section{}` structure and `\cite{}` placement, Wave 2 on prose within those structures.

### Pattern 5: LaTeX-Native Output (NEW for GTD)

**What:** The writer agent produces .tex files directly, not Markdown that gets converted. The output is valid LaTeX from the start.

**When:** All chapter writing.

**Why:** Markdown-to-LaTeX conversion is lossy and creates maintenance burden. Academic LaTeX requires precise control over `\cite{}`, `\ref{}`, figure environments, footnotes, and document class features. The writer agent should produce:
```latex
\chapter{Fundamentacao Teorica}
\label{chap:fundamentacao}

\section{Conceitos Fundamentais}
\label{sec:conceitos}

A teoria de \citet{Vygotsky1978} estabelece que o desenvolvimento cognitivo...
```

**Template awareness:** The writer must know the active LaTeX template's conventions (abnTeX2 commands like `\imprimirautor`, `\imprimirtitulo`, etc.).

### Pattern 6: Dual-Track Chapter Storage (adapted from GWD)

**What:** Planning artifacts live in `.planning/chapters/NN-slug/` (PLAN.md, DRAFT.tex, REVIEW.md, SUMMARY.md). Final approved .tex files are copied to `src/chapters/` for compilation.

**When:** Chapter finalization after review gate.

**Why:** The `.planning/` directory is the agent workspace (multiple drafts, reviews, revision artifacts). The `src/` directory is the clean LaTeX source tree that compiles to PDF. This separation prevents compilation from picking up intermediate drafts and keeps the LaTeX project structure clean.

```
.planning/chapters/03-fundamentacao/
    03-01-PLAN.md           <- planner output
    03-01-DRAFT-w1.tex      <- wave 1 draft
    03-01-DRAFT.tex         <- wave 2 (final) draft
    03-01-REVIEW.md         <- reviewer output
    03-01-SUMMARY.md        <- summary extraction

src/chapters/
    ch03-fundamentacao.tex  <- approved, compiled version
```

### Pattern 7: Academic Review with 4 Check Categories (NEW for GTD)

**What:** The reviewer agent runs 4 academic-specific check categories instead of the 6 literary categories in GWD.

**Categories:**
1. **Citations** -- Every `\cite{}` in the chapter exists in the .bib file. Citation style matches the configured norm (ABNT/APA). No orphan citations. No citation-free argumentative claims.
2. **Methodological rigor** -- Claims are supported by evidence. Methodology chapter matches what was described. Statistical claims have proper citations.
3. **Argumentative coherence** -- Chapter thesis advances the overall thesis. No internal contradictions. No contradiction with prior chapters. Terms used consistently with FRAMEWORK.md glossary.
4. **Formatting norms** -- LaTeX structure matches the configured academic norm. Section hierarchy correct. Figures have captions and labels. Tables follow the norm's conventions.

**When:** Every chapter review.

**Why:** Academic theses are evaluated on these dimensions by human reviewers (advisors, committees). The AI reviewer should check the same things.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Markdown-to-LaTeX Conversion Pipeline

**What:** Writing chapters in Markdown and converting to LaTeX with pandoc or similar tools.

**Why bad:** Conversion is lossy for academic LaTeX. You lose precise control over `\cite{}` vs `\citep{}` vs `\citet{}`, figure placement (`[htbp]`), custom environments (theorem, definition), abnTeX2-specific commands, and cross-referencing with `\ref{}` and `\label{}`. Debugging conversion artifacts adds friction.

**Instead:** Writer agent produces LaTeX directly. Templates provide the structure; the agent fills in content with proper LaTeX commands.

### Anti-Pattern 2: Monolithic LaTeX File

**What:** Putting the entire thesis in a single `main.tex` file.

**Why bad:** Context windows cannot hold a full thesis. Individual chapters need independent editing. The `\input{}` / `\include{}` pattern is standard LaTeX practice for thesis documents.

**Instead:** `main.tex` uses `\include{chapters/ch01-introducao}` for each chapter. Each chapter file is independent and can be compiled in isolation for testing.

### Anti-Pattern 3: Loading Full Canonical Context in Orchestrator

**What:** The workflow loading FRAMEWORK.md, STYLE_GUIDE.md, and STRUCTURE.md to pass content to agents.

**Why bad:** Wastes the orchestrator's context budget on content the agents will read themselves. Especially problematic because FRAMEWORK.md grows with each chapter (glossary entries, positions, continuity map).

**Instead:** Pass file paths and chapter numbers. Agents run `gtd-tools.js context --chapter N` in their own fresh 200K windows.

### Anti-Pattern 4: Parallel Agent Execution for Sequential Dependencies

**What:** Running the writer and reviewer in parallel, or running framework-keeper and summary-writer simultaneously.

**Why bad:** The reviewer needs the writer's output. The summary-writer needs the framework-keeper's updated FRAMEWORK.md for cross-referencing. These have strict sequential dependencies.

**Instead:** Sequential pipeline: plan -> write (w1 -> w2) -> review -> continuity (framework-keeper -> summary-writer). Only the figure pipeline can run in parallel with other work (pre-compile step).

### Anti-Pattern 5: Storing .bib Entries in Canonical Documents

**What:** Duplicating reference metadata in FRAMEWORK.md or STRUCTURE.md alongside the .bib file.

**Why bad:** Creates two sources of truth for references. The .bib file IS the canonical reference database. Duplicating entries leads to drift.

**Instead:** The .bib file is the single source of truth for references. The reference-manager agent reads and writes the .bib directly. FRAMEWORK.md may reference key works conceptually ("Vygotsky's ZPD theory") but never duplicates bibliographic metadata.

## Scalability Considerations

| Concern | Small thesis (UG, 5 chapters) | Medium thesis (MSc, 8 chapters) | Large thesis (PhD, 12+ chapters) |
|---------|-------------------------------|----------------------------------|-----------------------------------|
| Context chain length | Short, no token pressure | Moderate, monitor FRAMEWORK.md | Long, archival protocol likely needed |
| FRAMEWORK.md size | Under 3K tokens | 3-5K tokens | May exceed 5K, needs archival |
| Compilation time | Fast (<30s) | Moderate (~1min) | Slower (~2-3min), latexmk handles |
| Figure count | Few (5-10) | Moderate (15-30) | Many (30+), pipeline speed matters |
| .bib size | Small (20-50 refs) | Medium (50-150 refs) | Large (150-300+ refs), no issue for bibtex |
| Cross-chapter consistency | Easy to maintain manually | Agent chain helps significantly | Agent chain is essential |

## Suggested Build Order

Build order is driven by dependencies. Each layer requires the ones beneath it.

### Layer 0: Foundation (no dependencies)

**Build first -- everything depends on this.**

| Component | What | Why First |
|-----------|------|-----------|
| `gtd-tools.js` | CLI utility: init, progress, context assembly | Every workflow and agent depends on this tool |
| Templates (canonical) | `framework.md`, `style-guide.md`, `structure.md` | Init command scaffolds from these |
| Templates (LaTeX) | `main.tex`, `chapter.tex`, abnTeX2 setup | LaTeX project scaffolding needs templates |
| `install.js` | npm installer for /gtd:* commands | Distribution mechanism |
| `package.json` | Package configuration | npm distribution |

### Layer 1: Initialization (depends on Layer 0)

**The entry point -- must work before any chapter work.**

| Component | What | Depends On |
|-----------|------|------------|
| `new-thesis` command + workflow | Deep questioning, canonical doc population, LaTeX scaffolding | gtd-tools.js init, templates |
| `progress` command | Dashboard showing chapter statuses | gtd-tools.js progress |

### Layer 2: Core Writing Pipeline (depends on Layer 1)

**The main value loop -- plan, write, review per chapter.**

| Component | What | Depends On |
|-----------|------|------------|
| `planner` agent | Creates chapter beat sheet (PLAN.md) | Canonical context assembly (gtd-tools.js context) |
| `writer` agent | Produces LaTeX chapter drafts (Wave 1 + Wave 2) | Planner output, LaTeX template awareness |
| `reviewer` agent (4 categories) | Academic QA on .tex drafts | Writer output, canonical docs, .bib file |
| `plan-chapter` command + workflow | Orchestrates planning with human checkpoint | planner agent |
| `write-chapter` command + workflow | Orchestrates full plan->write->checkpoint pipeline | planner + writer agents |
| `review-chapter` command + workflow | Orchestrates review->revision cycle | reviewer + writer agents |
| `discuss-chapter` command + workflow | Pre-planning discussion, CONTEXT.md | STRUCTURE.md chapter entries |

### Layer 3: Continuity System (depends on Layer 2)

**Maintains cross-chapter consistency. Cannot run until review gate exists.**

| Component | What | Depends On |
|-----------|------|------------|
| `framework-keeper` agent | Updates FRAMEWORK.md after approved chapters | Reviewed + approved chapter drafts |
| `summary-writer` agent | Fills SUMMARY.md with structured extraction | Updated FRAMEWORK.md (must run after framework-keeper) |
| `continuity-loop` workflow | Orchestrates framework-keeper -> summary-writer chain | Both agents above |

### Layer 4: Reference Management (depends on Layer 0, enriches Layer 2)

**Can be built in parallel with Layer 2, but enriches the writing pipeline.**

| Component | What | Depends On |
|-----------|------|------------|
| `reference-manager` agent | .bib validation, citation checking, PDF management | .bib file format, src/ structure |
| `add-reference` command + workflow | Add reference from .bib import, PDF, DOI, or manual | reference-manager agent |
| Citation validation in reviewer | Check \cite{} entries against .bib | reference-manager logic, reviewer agent |

### Layer 5: Figure Management (depends on Layer 0, enriches compilation)

**Can be built in parallel with Layers 2-3. Required before compilation.**

| Component | What | Depends On |
|-----------|------|------------|
| `figure-manager` agent | Figure catalog, source file generation | FIGURES.md format, figure source types |
| `add-figure` command + workflow | Generate/register figures | figure-manager agent |
| `figure-pipeline.py` | Export pipeline: .py->.png, .excalidraw->.pdf, .mmd->.png | External tools (Python, excalirender, mmdc) |
| `requirements.txt` | Python dependencies (matplotlib, plotly, etc.) | Python ecosystem |

### Layer 6: Compilation (depends on Layers 0, 4, 5)

**End-to-end: figure pre-processing + LaTeX compilation.**

| Component | What | Depends On |
|-----------|------|------------|
| `compile` command + workflow | Figure pipeline -> latexmk -> PDF | figure-pipeline.py, LaTeX templates, .bib |
| `latexmk` configuration | .latexmkrc with abnTeX2 settings | LaTeX template choice |

### Dependency Graph (ASCII)

```
Layer 0: [gtd-tools.js] [templates] [install.js]
              |               |
              v               v
Layer 1: [new-thesis] [progress]
              |
              v
Layer 2: [planner] -> [writer] -> [reviewer]
         [plan-chapter] [write-chapter] [review-chapter] [discuss-chapter]
              |
              v
Layer 3: [framework-keeper] -> [summary-writer]
         [continuity-loop]

Layer 4: [reference-manager] [add-reference]  (parallel with L2)
              |
              v
Layer 5: [figure-manager] [add-figure] [figure-pipeline.py]  (parallel with L2-L3)
              |
              v
Layer 6: [compile]  (requires L4 + L5)
```

## Key Architectural Decisions

### Decision 1: LaTeX Direct Output vs Markdown Conversion

**Decision:** Writer agent produces LaTeX directly.

**Rationale:** Academic LaTeX requires `\cite{key}`, `\citep{key}`, `\citet{key}`, `\ref{fig:name}`, `\label{sec:name}`, custom environments, and template-specific commands. Pandoc conversion from Markdown loses precision on all of these. The writer agent's system prompt includes LaTeX template conventions as part of its instructions.

**Implication:** The writer agent prompt is more complex (must know LaTeX), but output quality is higher and there is no conversion step to debug.

### Decision 2: latexmk for Compilation (not manual pdflatex chain)

**Decision:** Use `latexmk -pdf` for compilation.

**Rationale:** latexmk automatically handles the multi-pass compilation cycle (pdflatex -> bibtex -> makeindex -> pdflatex x N). It detects when re-runs are needed based on .aux file changes. This is the standard approach recommended by the LaTeX community and used by Overleaf. No need for the user or the system to manage compilation order.

**Implication:** The compile command is simpler (just run latexmk), but requires latexmk to be installed alongside TeX Live/MiKTeX.

### Decision 3: Dual-Track Storage (.planning/ vs src/)

**Decision:** Agent workspace in `.planning/chapters/`, compiled source in `src/`.

**Rationale:** Agents produce intermediate artifacts (PLAN.md, multiple draft versions, REVIEW.md, SUMMARY.md) that should not be in the LaTeX compilation path. The `src/` directory contains only the clean, approved .tex files that compile to PDF. This mirrors how professional software projects separate source from build artifacts.

**Implication:** The finalization step must copy approved .tex from `.planning/` to `src/`. This is an explicit action, preventing accidental compilation of draft material.

### Decision 4: Figure Source Separation

**Decision:** Figure sources in `figures/sources/`, compiled figure outputs in `src/figures/`.

**Rationale:** Source files (.excalidraw, .py, .mmd) require different toolchains to export. The figure pipeline processes all sources and places outputs where LaTeX can find them (`src/figures/`). This separation means the LaTeX project only sees the final images, not the source files.

**Implication:** The compile workflow must run the figure pipeline BEFORE latexmk. The figure catalog (FIGURES.md) tracks the source-to-output mapping.

### Decision 5: 4 Academic Review Categories (not 6 literary)

**Decision:** Replace GWD's 6 literary categories (term consistency, voice pattern matching, voice drift, inter-chapter continuity, repetition detection, Portuguese BR quality) with 4 academic categories (citations, methodological rigor, argumentative coherence, formatting norms).

**Rationale:** Academic theses are evaluated differently than creative books. Citation validation against .bib is a hard requirement. Methodological rigor checking matters more than voice drift detection. Some GWD categories merge naturally in the academic context (term consistency + argumentative coherence = one category; voice matching + Portuguese quality can be a sub-check of formatting norms).

**Implication:** The reviewer agent prompt is substantially rewritten from GWD. The review output format (REVIEW.md) keeps the structured evidence-based approach but reorganizes around academic dimensions.

## Sources

- GWD source code and architecture (read directly from repository -- HIGH confidence)
- [latexmk documentation](https://texdoc.org/serve/latexmk/0) -- compilation automation (HIGH confidence)
- [abnTeX2 on CTAN](https://ctan.org/pkg/abntex2) -- Brazilian academic LaTeX template (HIGH confidence)
- [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) -- diagram export automation (HIGH confidence)
- [excalirender](https://github.com/JonRC/excalirender) -- Excalidraw CLI export (MEDIUM confidence -- third-party tool)
- [Claude Code subagent docs](https://code.claude.com/docs/en/sub-agents) -- Task() architecture (HIGH confidence)
- [Google multi-agent design patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/) -- sequential pipeline pattern validation (MEDIUM confidence)
- [Plotly static image export](https://plotly.com/python/static-image-export/) -- figure automation (HIGH confidence)
