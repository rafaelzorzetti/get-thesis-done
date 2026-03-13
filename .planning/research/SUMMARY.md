# Project Research Summary

**Project:** Get Thesis Done (GTD)
**Domain:** Multi-agent AI-powered academic thesis writing system (LaTeX output, CLI toolbox)
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

Get Thesis Done is a zero-runtime-dependency npm CLI package that installs as slash commands for Claude Code, orchestrating a 7-agent pipeline to help students write academic theses in LaTeX. The product follows the proven GWD (Get Writing Done) architecture — orchestrator workflows coordinate specialized subagents in fresh 200K context windows, with canonical documents (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md) serving as the cross-chapter consistency mechanism. The output is a compilable, ABNT-compliant (or APA/IEEE) LaTeX project that the student compiles locally with TeX Live. This is not a web app or cloud editor; it is a local AI writing tool that extends Claude Code with thesis-specific intelligence.

The recommended approach is to build in strict dependency order: foundation tools first (gtd-tools.js, LaTeX templates, install mechanism), then initialization, then the core plan-write-review cycle, then the continuity loop that maintains cross-chapter coherence, and finally the reference management and figure pipeline enhancements. The single most important architectural decision — made early and irreversibly — is adopting biber+biblatex (not bibtex+natbib) for UTF-8 support with Portuguese/Spanish names, and a pre-verified abnTeX2 LaTeX template as the default. These choices must be baked into the project initialization template before any AI writing pipeline runs.

The highest-risk technical area is citation hallucination: LLMs fabricate ~40-56% of academic citations when unconstrained. The architecture addresses this through a hard constraint: the writer agent may ONLY cite keys present in the user's .bib file, and every generated .tex file is validated against the .bib before compilation. The second-highest risk is agent drift in the multi-chapter pipeline — mitigated by typed schemas at every agent boundary, human checkpoints at each phase gate, and comprehensive canonical documents that grow with the thesis. Both mitigations must be architected before building individual agents, not retrofitted afterward.

## Key Findings

### Recommended Stack

GTD uses zero runtime npm dependencies — all CLI functionality is built from Node.js 18+ built-ins (fs, path, child_process, util.parseArgs, node:test). This mirrors GWD's proven pattern and eliminates dependency conflicts. The only optional runtime dependency is `citation-js` (^0.7.22), added only if the custom .bib parser hits edge cases with LaTeX macros or @string variables. Python (>=3.10) is isolated to the figure generation pipeline with its own requirements.txt; the Python environment never bleeds into the Node.js CLI.

External tools (pdflatex, latexmk, biber, mmdc, Python) are invoked via child_process.spawn() — the system orchestrates local toolchains rather than bundling them. This means TeX Live, Python 3.10+, and Node.js 18+ are prerequisites documented at project initialization, not bundled. The Excalidraw export pipeline is the heaviest optional dependency (Playwright + ~100MB), treated as an optional user install.

**Core technologies:**
- Node.js >=18.0.0: CLI runtime with built-in parseArgs, test runner, and fetch — zero dependencies
- latexmk + pdflatex (TeX Live): Compilation automation via child_process.spawn() — handles multi-pass builds automatically
- biber + biblatex: Bibliography processing — UTF-8 native, required for Portuguese/accented names
- abnTeX2 (TeX Live): Default Brazilian academic template — ABNT NBR 14724 compliant
- Python >=3.10 + matplotlib + SciencePlots: Publication-quality academic figures
- Custom `{{PLACEHOLDER}}` template engine: LaTeX's `{}` syntax conflicts with every standard template engine
- esbuild ^0.27.0: Dev dependency for hook bundling (mirrors GWD pattern)

### Expected Features

**Must have (table stakes):**
- LaTeX output with correct document structure (chapters, sections, figures, equations, environments)
- BibTeX/BibLaTeX reference integration — read .bib files, produce `\cite{}` commands
- Citation validation — every `\cite{key}` must resolve to a .bib entry; zero hallucinated citations
- ABNT/abnTeX2 formatting as default with configurable norm support (APA, IEEE)
- Chapter-by-chapter writing workflow — plan, write, review cycle per chapter
- Multi-file LaTeX project structure using `\include{}`/`\input{}`
- LaTeX compilation to PDF (latexmk orchestration)
- Cross-reference validation (`\ref{}` / `\label{}` pairing)
- Academic tone and style enforcement via STYLE_GUIDE.md
- Progress tracking dashboard (chapter status: not started / drafted / reviewed / final)
- Multi-language support (Portuguese, English, Spanish) via babel configuration

**Should have (competitive differentiators):**
- Multi-agent pipeline with 7 specialized roles (planner, writer, reviewer, framework-keeper, summary-writer, reference-manager, figure-manager) — fundamentally different from single-prompt AI tools
- Canonical document system (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md) for cross-chapter consistency — GTD's core innovation
- Cross-chapter coherence enforcement — chapter 5 aligns with chapter 2's theoretical framework
- Adversarial academic review across 4 categories (citations, methodological rigor, argumentative coherence, formatting norms)
- DOI-based reference enrichment via Crossref REST API (free, no API key)
- Thesis-level awareness (undergrad / master's / PhD) affecting rigor and depth
- Beat sheet planning per chapter — structured plan before writing
- Figure catalog (FIGURES.md) with reference validation
- Continuity loop — framework-keeper updates canonical docs after each approved chapter
- Citation grounding (anti-hallucination) — writer agent constrained to existing .bib keys only

**Defer (v2+):**
- PDF metadata extraction for references (GROBID dependency, complex)
- Multi-format figure export pipeline (Excalidraw, Python, Mermaid automated pre-processing)
- University template marketplace (beyond abnTeX2 + custom)
- Advanced ABNT NBR 10520:2023 specific rule enforcement beyond abnTeX2

**Explicit anti-features (never build):**
- Cloud/online LaTeX compilation (Overleaf's business — out of scope)
- Plagiarism detection (requires massive databases, out of scope)
- Real-time collaborative editing (requires CRDT/OT, out of scope)
- Literature search / paper discovery (separate product domain)
- Full automatic one-click thesis generation (produces shallow, hallucination-prone output)

### Architecture Approach

GTD uses a sequential pipeline with human-in-the-loop architecture: orchestrator workflows coordinate specialized subagents, each running in fresh 200K context windows, reading their own context. Canonical documents maintained in `.planning/` serve as the single source of truth for thesis consistency. A dual-track storage model separates the agent workspace (`.planning/chapters/NN-slug/` with PLAN.md, DRAFT.tex, REVIEW.md, SUMMARY.md) from the compiled LaTeX source (`src/chapters/*.tex`). The figure pipeline (Python scripts, Mermaid CLI, Excalidraw export) runs as a pre-compilation step before latexmk.

**Major components:**
1. `gtd-tools.js` (CLI utility) — file scaffolding, context assembly, progress tracking, compilation orchestration; every workflow and agent depends on this
2. Canonical documents (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md) — single source of truth; updated via continuity loop after each approved chapter
3. Agent definitions (planner, writer, reviewer, framework-keeper, summary-writer, reference-manager, figure-manager) — specialized system prompts, each reading its own context bundle
4. LaTeX templates (main.tex, chapter.tex, abnTeX2 setup) — pre-verified ABNT-compliant structure; writer agents fill content only, never structural preamble
5. Figure pipeline (`figure-pipeline.py` + mmdc + excalidraw export) — multi-format export before latexmk runs
6. Reference manager (.bib parser, Crossref API, validation logic) — citation anti-hallucination enforcement

**Key patterns:**
- Orchestrator-Agent Isolation: orchestrators stay at 10-15% context budget; agents read full context in their own fresh windows
- Canonical Context Bundle: agents call `gtd-tools.js context --chapter N` to assemble FRAMEWORK + STYLE_GUIDE + chapter entry + prior summaries
- Progressive Summary Chain: each approved chapter produces a SUMMARY.md that travels with subsequent chapter context
- Two-Wave Writing: Wave 1 produces structural LaTeX draft; Wave 2 polishes prose and enforces academic voice
- LaTeX-Native Output: writer agent produces .tex directly — no Markdown-to-LaTeX conversion (lossy for academic commands)
- Dual-Track Storage: `.planning/` for agent workspace, `src/` for clean compilation tree

### Critical Pitfalls

1. **LLM citation hallucination (56% error rate)** — Enforce hard constraint: writer agent may ONLY cite keys from the user's .bib file. Build citation validation gate before writing pipeline runs. This must be architected in Phase 1, not added later.

2. **Agent drift and error cascading (17x amplification)** — Use typed schemas at every agent boundary (PLAN.md format, DRAFT.tex format, REVIEW.md format). Canonical documents are behavioral anchors. Sequential pipeline — never parallel writes from multiple agents. Human checkpoints at each phase gate.

3. **abnTeX2 structural incompatibilities** — Build and verify a complete ABNT-compliant abnTeX2 template (empty shell that compiles to structurally correct PDF) before any AI content generation. Writer agents only fill chapter content, never document structure or preamble.

4. **Zotero .bib encoding mismatch** — Standardize on biber+biblatex from project initialization. BibTeX cannot handle UTF-8 (critical for Portuguese/Brazilian names). This decision is irreversible after initialization; it must be in the template.

5. **LaTeX special character escaping failures** — Build a LaTeX sanitization layer that runs after every writer agent output. Context-aware: preserves `_` inside `\cite{}` but escapes it in prose text. Also addresses Pitfall 9 (figure path resolution): always use `\graphicspath{{./figures/}}` in main preamble, figure pipeline outputs to single flat directory.

## Implications for Roadmap

Based on combined research, all four research files converge on the same 6-layer build order. The dependency chain is non-negotiable: the canonical documents cannot exist without the templates; the writing pipeline cannot exist without the canonical documents; the continuity loop cannot exist without the writing pipeline having a review gate. The suggested phases below follow this dependency graph exactly.

### Phase 1: Foundation and Initialization

**Rationale:** Everything depends on this. gtd-tools.js is called by every workflow and agent. The LaTeX template must be ABNT-verified before any AI content is inserted. The biber+biblatex decision is irreversible once the template exists. The abnTeX2 structural requirements (pretextual/textual/postextual markers) must be correct from the start — retrofitting later is a high-cost rewrite.

**Delivers:** Working `npx get-thesis-done` install, `/gtd:new-thesis` command that scaffolds a compilable (empty) ABNT-compliant LaTeX project with canonical documents, progress dashboard.

**Addresses features:** Thesis initialization, canonical documents, LaTeX project structure, multi-language support, university template (abnTeX2 default), progress tracking.

**Avoids pitfalls:** abnTeX2 structural incompatibilities (Pitfall 8), Zotero encoding mismatch (Pitfall 7), bibtex vs biber decision (Pitfall 5). Test: empty template compiles to structurally correct PDF with correct margins, font, spacing before any other work proceeds.

**Needs research-phase:** No — this is the GWD pattern adapted to LaTeX. Patterns are well-documented.

### Phase 2: Core Writing Pipeline (Plan + Write + Compile)

**Rationale:** The minimum viable product. A student must be able to plan a chapter, generate a LaTeX draft, and compile to PDF. Citation validation must be built into this phase — not deferred — because citation hallucination is the highest-trust risk and retrofitting the constraint is costly. The LaTeX sanitization layer belongs here too.

**Delivers:** `/gtd:plan-chapter`, `/gtd:write-chapter`, `/gtd:compile` with basic citation validation. A student can produce a first chapter as a compiled PDF.

**Addresses features:** Beat sheet planning, two-wave chapter writing, citation grounding (anti-hallucination), BibTeX import, LaTeX compilation, cross-reference validation.

**Avoids pitfalls:** Citation hallucination (Pitfall 1 — hard .bib constraint in writer prompt), LaTeX special character escaping (Pitfall 3 — sanitization layer post-writer), compilation sequence errors (Pitfall 5 — latexmk from day one), figure path resolution (Pitfall 9 — graphicspath established in template).

**Stack elements:** Node.js child_process for latexmk, custom .bib parser, Crossref fetch() for DOI (optional), node:test for CI.

**Needs research-phase:** No for core compilation and .bib parsing. Yes for the citation validation schema design if the reviewer wants to do deeper research into annotation formats.

### Phase 3: Review and Continuity Loop

**Rationale:** Without the reviewer and the continuity loop, GTD is a one-chapter tool. The framework-keeper and summary-writer agents are the mechanism that makes multi-chapter theses coherent. The reviewer creates the quality gate that the continuity loop depends on. These three components form an inseparable trio.

**Delivers:** `/gtd:review-chapter` with 4-category academic review, continuity loop (framework-keeper + summary-writer agents), cross-chapter coherence enforcement.

**Addresses features:** Adversarial academic review, continuity loop, cross-chapter coherence, FRAMEWORK.md updates, progressive summary chain.

**Avoids pitfalls:** Cross-chapter consistency collapse (Pitfall 4 — canonical documents as behavioral anchors), agent drift (Pitfall 2 — typed REVIEW.md schema, validation gates between review and continuity loop), reviewer always saying "looks good" (UX pitfall — design as adversarial by default).

**Architecture components:** reviewer agent (4 categories), framework-keeper agent, summary-writer agent, continuity-loop workflow.

**Needs research-phase:** Possibly for the inter-agent schema design and review output format — how structured the REVIEW.md format should be for downstream consumption.

### Phase 4: Reference Management

**Rationale:** Can be built in parallel with Phase 3 but enriches the writing pipeline. DOI fetch via Crossref is simple (free API, no auth, built-in fetch()). PDF metadata extraction is more complex (GROBID dependency) and can be deferred to Phase 5+. The reference-manager agent validates .bib structure and enforces the citation grounding constraint established in Phase 2.

**Delivers:** `/gtd:add-reference` command supporting .bib import, DOI fetch, and manual entry. .bib validation with encoding checks.

**Addresses features:** DOI-based reference enrichment, .bib import, reference validation, PDF cross-referencing (deferred).

**Avoids pitfalls:** Zotero encoding mismatch (Pitfall 7 — .bib import validator warns on encoding issues), full .bib in context window (performance trap — pass only relevant entries to agents, not full file).

**Needs research-phase:** No — Crossref API is well-documented and free. Custom .bib parsing is a solved problem.

### Phase 5: Figure Management and Pipeline

**Rationale:** High complexity, multiple runtime dependencies, and independent of the core writing pipeline. Students can add figures manually in Phase 1-4. The figure pipeline is a force multiplier, not a blocker. Each format (Python, Mermaid, Excalidraw, TikZ) should be built and tested independently before integration.

**Delivers:** `/gtd:add-figure`, figure catalog (FIGURES.md), figure pre-processing pipeline integrated into `/gtd:compile`. Python + Mermaid figures as first-class formats; Excalidraw and TikZ as advanced options.

**Addresses features:** Multi-format figure generation, figure catalog with reference validation, automated export pipeline.

**Avoids pitfalls:** Figure pipeline fragility (Pitfall 6 — independent test suites per format, prioritize reliability: static > Python > Mermaid > Excalidraw > TikZ), TikZ AI generation quality (Pitfall 10 — template library first, freeform generation discouraged), Python matplotlib headless (integration gotcha — explicit Agg backend, savefig not show()).

**Stack elements:** Python/matplotlib/SciencePlots/plotly/kaleido, @mermaid-js/mermaid-cli (npx), excalidraw-brute-export-cli (optional, user-installed).

**Needs research-phase:** Yes for Excalidraw export tooling (MEDIUM confidence in research — excalidraw-brute-export-cli vs alternatives). Also validate kaleido v1.0+ Chrome requirement before recommending Plotly for static export.

### Phase Ordering Rationale

- Phases 1-2 are strictly sequential: templates must exist before compilation can be tested; compilation must work before writing is meaningful.
- Phase 3 depends on Phase 2 having a review gate; the continuity loop requires an approved chapter to update FRAMEWORK.md.
- Phase 4 can begin in parallel with Phase 3 (the reference-manager agent is architecturally independent of the reviewer).
- Phase 5 is last because it has the most external dependencies, the lowest reliability for AI generation (TikZ), and the longest test surface. It enriches a working system rather than enabling one.
- The figure pipeline in Phase 5 must be integrated into the compile workflow from Phase 2 via a pre-processing step — the compile command's contract must reserve space for this hook from day one.

### Research Flags

Phases needing deeper research during planning:
- **Phase 5 (Figure Pipeline):** Excalidraw export tooling confidence is MEDIUM. Validate excalidraw-brute-export-cli reliability before building around it. Also validate kaleido v1.0+ requirement for Chrome (breaking change from v0.x). Consider whether Kroki (unified diagram API) is simpler than managing 4 separate toolchains.
- **Phase 3 (Review schemas):** The inter-agent communication format (PLAN.md, REVIEW.md schemas) should be designed with care. Consider whether a lightweight JSON schema validation step is worthwhile at agent boundaries.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** GWD codebase is the direct template. LaTeX/abnTeX2 documentation is comprehensive. No research needed.
- **Phase 2 (Core Writing):** Node.js child_process patterns, latexmk usage, and BibTeX parsing are well-documented. Crossref API is trivially documented.
- **Phase 4 (Reference Management):** Crossref REST API is free and well-documented. Custom .bib parsing is a solved problem with clear precedents.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Derived from working GWD codebase + verified npm/PyPI versions. Zero runtime deps approach is proven. Only uncertainty is Excalidraw CLI tooling (MEDIUM). |
| Features | HIGH | Validated against Overleaf, Paperpal, Thesify, Gatsbi, PaperDebugger. Table stakes features are unambiguous. Differentiators are clear from competitor analysis. |
| Architecture | HIGH | Directly adapted from working GWD implementation. Patterns are validated: orchestrator isolation, canonical context bundle, progressive summary chain, two-wave writing. LaTeX-native output is a clear decision. |
| Pitfalls | HIGH | Each critical pitfall is backed by empirical data (56% citation hallucination rate, 17x multi-agent error amplification, 28% TikZ success rate). Mitigations are specific and actionable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Excalidraw CLI reliability:** Research flagged excalidraw-brute-export-cli at MEDIUM confidence. Before Phase 5 planning, validate: does it work headlessly on Linux (WSL2 specifically)? Does the Playwright dependency install cleanly? What is the fallback if it doesn't?
- **kaleido v1.0+ Chrome requirement:** Kaleido v1.0 no longer bundles Chrome. This means plotly static export requires a system Chrome install. Validate whether this is acceptable for the target user (grad students on various OS) or whether PDF-only matplotlib is a better default.
- **abnTeX2 + biblatex compatibility:** Some abnTeX2 templates assume natbib/bibtex bibliography commands. Verify that the chosen template is compatible with biber+biblatex before finalizing the template. This is a one-time verification during Phase 1.
- **discuss-chapter command scope:** ARCHITECTURE.md mentions a `/gtd:discuss-chapter` pre-planning discussion command but FEATURES.md doesn't detail it. Clarify scope during Phase 3 planning (is it a structured Socratic dialogue that produces a CONTEXT.md file, or just a free-form pre-planning chat?).
- **PDF metadata extraction decision:** FEATURES.md lists PDF metadata extraction (GROBID) as Phase 3. Research notes GROBID is a complex dependency. Decision point: is this worth implementing at all, or does the DOI fetch path cover 90% of use cases?

## Sources

### Primary (HIGH confidence)
- GWD source code (rafaelzorzetti/get-writing-done) — architecture patterns, CLI patterns, agent design
- [Node.js v25 Documentation](https://nodejs.org/api/) — child_process, util.parseArgs, test runner, fetch
- [Crossref REST API Documentation](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) — DOI metadata fetch
- [abnTeX2 on CTAN](https://ctan.org/pkg/abntex2) — ABNT template requirements
- [latexmk Documentation](https://mg.readthedocs.io/latexmk.html) — compilation automation
- [matplotlib on PyPI](https://pypi.org/project/matplotlib/) v3.10.8 — figure generation
- [plotly on PyPI](https://pypi.org/project/plotly/) v6.5.2 — interactive figures
- [SciencePlots on PyPI](https://pypi.org/project/SciencePlots/) v2.2.1 — academic figure styles
- [Mermaid CLI on GitHub](https://github.com/mermaid-js/mermaid-cli) — diagram export
- [ChatGPT citation hallucination study](https://studyfinds.org/chatgpts-hallucination-problem-fabricated-references/) — 56% fabrication rate
- [Multi-agent 17x error trap](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/) — error amplification
- [Agent drift study (arXiv 2601.04170)](https://arxiv.org/abs/2601.04170) — 42% success rate reduction
- [TikZ LLM benchmark (arXiv 2505.04670)](https://arxiv.org/abs/2505.04670) — 28% TikZ success rate

### Secondary (MEDIUM confidence)
- [Overleaf Features Overview](https://www.overleaf.com/about/features-overview) — feature baseline
- [PaperDebugger (arXiv 2512.02589)](https://arxiv.org/abs/2512.02589) — multi-agent LaTeX writing
- [Paperpal for students](https://paperpal.com/paperpal-for-students) — AI academic writing landscape
- [Thesify AI](https://www.thesify.ai/) — competitor feature analysis
- [Gatsbi AI Paper Writer](https://www.gatsbi.com/ai-paper-writer) — competitor analysis
- [excalidraw-brute-export-cli](https://github.com/realazthat/excalidraw-brute-export-cli) — Excalidraw export
- [kaleido on PyPI](https://pypi.org/project/kaleido/) — plotly static export
- [Zotero BibTeX encoding discussion](https://forums.zotero.org/discussion/24136/default-encoding-in-bibtex-export) — UTF-8 + biber recommendation

### Tertiary (LOW confidence)
- [Kroki unified diagram API](https://kroki.io/) — potential figure pipeline simplification (not yet evaluated as GTD alternative)

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
