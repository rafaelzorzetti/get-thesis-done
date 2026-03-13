# Feature Landscape

**Domain:** AI-powered academic thesis writing system (LaTeX output, multi-agent pipeline)
**Researched:** 2026-03-13

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **LaTeX output with proper document structure** | Thesis = `\chapter{}`, `\section{}`, `\subsection{}`, figures, tables, equations. Users choose LaTeX precisely for this. | Medium | Must produce valid, compilable `.tex` files with correct environments. Every academic LaTeX tool (Overleaf, LaTeX Workshop) does this. |
| **BibTeX/BibLaTeX reference integration** | Every thesis has a bibliography. `.bib` import from Zotero/Mendeley is the universal workflow. | Medium | Better BibTeX for Zotero is the standard bridge. System must read `.bib` files and produce correct `\cite{}` commands. |
| **Citation validation (`\cite{}` vs `.bib`)** | Broken citations = compilation warnings and missing references in PDF. Unacceptable in a submitted thesis. | Low | Validate every `\cite{key}` has a matching `.bib` entry. Tools like Recite and Trinka do this for Word; GTD must do it for LaTeX. |
| **Configurable academic formatting norms** | Brazilian theses require ABNT (via abnTeX2). Other regions require APA, Chicago, IEEE. Not configurable = not usable globally. | Medium | abnTeX2 handles ABNT formatting in LaTeX. APA/Chicago handled by `biblatex` styles. System must allow norm selection at init. |
| **University template support** | Every university has its own LaTeX template with specific margins, title page, approval sheet format. Using the wrong template = rejection. | Medium | Must support custom `.cls`/`.sty` files. Provide abnTeX2 as default, allow user-provided templates. Overleaf has thousands of university templates. |
| **Chapter-by-chapter writing workflow** | Theses are written incrementally, chapter by chapter. No one writes a thesis in one shot. | Medium | Core pipeline: plan chapter, write chapter, review chapter. This is how every thesis advisor works with students. |
| **Multi-file LaTeX project structure** | Theses use `\include{}` / `\input{}` for chapters, appendices, preamble. Single-file thesis is a non-starter. | Low | Standard LaTeX practice. `main.tex` + individual chapter files + preamble. |
| **LaTeX compilation to PDF** | Users need to see their output. Compilation with `pdflatex` + `bibtex`/`biber` is the expected workflow. | Low | Use `latexmk` to handle the multi-pass compilation automatically. User must have TeX Live/MiKTeX installed locally. |
| **Cross-reference validation (`\ref{}`, `\label{}`)** | Broken cross-references show "??" in the PDF. This is a basic quality issue. | Low | Validate all `\ref{fig:*}`, `\ref{tab:*}`, `\ref{sec:*}` have corresponding `\label{}`. |
| **Academic tone and style enforcement** | AI-generated text must sound like academic writing, not blog posts. Wrong register = advisor rejection. | Medium | Style guide (STYLE_GUIDE.md) with voice specification, tense rules, hedging patterns, discipline-specific conventions. Thesify and Paperpal do this. |
| **Progress tracking / dashboard** | Students and advisors need to know: which chapters are drafted, reviewed, finalized. Without this, project management is chaos. | Low | MIT's writing dashboard concept: status per chapter (not started / drafted / reviewed / final). Simple but essential. |
| **Multi-language support** | Theses are written in Portuguese, English, Spanish, French, German globally. Hardcoding one language = losing most users. | Low | Language setting at init affects: `\usepackage[language]{babel}`, style guide voice rules, norm selection. |

## Differentiators

Features that set GTD apart from competitors. Not universally expected, but create significant value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-agent pipeline with specialized roles** | Unlike Overleaf (just an editor) or Paperpal (just grammar), GTD orchestrates planner + writer + reviewer + framework-keeper as a coordinated team. This is fundamentally different from single-prompt AI tools. | High | 7 specialized agents with distinct system prompts. Gatsbi and PaperDebugger use multi-agent approaches, but neither targets thesis-length documents with chapter-level orchestration. |
| **Canonical document system (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md)** | Maintains thesis-wide consistency across months of writing. No other tool tracks theoretical framework, argumentative positions, and glossary as living documents that inform every chapter. | High | This is GTD's core innovation from GWD. The framework-keeper agent updates these after each chapter, ensuring chapter 7 is coherent with chapter 2's theoretical foundations. |
| **Cross-chapter coherence enforcement** | AI tools check grammar per-paragraph. GTD checks that chapter 5's methodology aligns with chapter 3's theoretical framework, that terminology is consistent, that arguments build logically across the full document. | High | Requires inter-chapter context chain via summary-writer agent. Most tools (Thesify, Paperpal) analyze chapters in isolation. |
| **Adversarial academic review (4 categories)** | Dedicated reviewer agent checks citations, methodological rigor, argumentative coherence, AND formatting norms in a structured review. Like having a demanding committee member built in. | Medium | Thesify offers AI feedback, but not structured adversarial review across 4 distinct dimensions with actionable revision items. |
| **Figure generation pipeline (multi-format)** | Generate and manage figures in Excalidraw, Python (matplotlib/plotly), TikZ/PGF, and Mermaid from descriptions. Automated export to PDF/PNG for LaTeX inclusion. | High | No thesis tool offers integrated figure generation across 4 formats with a catalog system. Gatsbi generates figures but only as static images. Kroki provides a unified API for diagram rendering that could be leveraged. |
| **DOI-based reference enrichment** | Given a DOI, automatically fetch metadata from Crossref API and generate a `.bib` entry. Saves manual BibTeX entry creation. | Low | Crossref REST API is free, no signup required. Returns JSON with full bibliographic metadata. Simple HTTP call + BibTeX formatting. |
| **PDF metadata extraction for references** | When user has PDFs but no `.bib`, extract metadata (title, authors, DOI) from PDF and generate `.bib` entries. | Medium | Fallback workflow for users who collected PDFs without proper reference management. GROBID or similar tools can extract structured metadata from academic PDFs. |
| **Thesis-level awareness (graduation/master's/PhD)** | Automatically adjust rigor expectations, length targets, and review criteria based on thesis level. A graduation monograph has different standards than a PhD dissertation. | Low | Configuration at init. Affects reviewer strictness, planner section depth, writer verbosity. Simple but meaningful differentiation. |
| **Beat sheet planning per chapter** | Before writing, the planner creates a structured plan: sections, key arguments per section, planned citations, how this chapter connects to the theoretical framework. | Medium | Adapted from GWD's beat sheet concept. Prevents the common problem of writing without a plan and ending up with incoherent chapters. |
| **Figure catalog with reference validation** | FIGURES.md tracks every figure: type, source file, caption, label. Validates that every `\ref{fig:*}` in the text has a corresponding figure in the catalog. | Low | Prevents orphaned figure references and undocumented figures. No other tool provides this level of figure management for thesis writing. |
| **Continuity loop (post-review canonical update)** | After a chapter is reviewed and approved, the framework-keeper updates FRAMEWORK.md with new terms, positions, and argumentative threads. This feeds into the next chapter's planning. | Medium | The key mechanism that maintains coherence across a 6-month writing process. Unique to GTD's architecture. |
| **Citation grounding (anti-hallucination)** | Writer agent can ONLY cite references that exist in the `.bib` file. No hallucinated citations. Every `\cite{}` must resolve to a real entry. | Medium | 40% of AI-generated citations are fabricated (Enago Academy, 2025). This is the single most important trust feature. Grounding citations against the `.bib` file is architecturally simple but competitively critical. |

## Anti-Features

Features to explicitly NOT build. These are tempting but would dilute focus, add complexity, or conflict with GTD's philosophy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Online/cloud LaTeX compilation (Overleaf-style)** | Requires server infrastructure, real-time collaboration protocol, cloud storage. This is Overleaf's entire business. GTD is a local AI writing tool, not a cloud editor. | Local `pdflatex`/`latexmk` via user's TeX Live installation. Simple, reliable, no infrastructure. |
| **Plagiarism detection** | Plagiarism checking requires massive document databases (Turnitin, iThenticate). Building this is a multi-million dollar effort and outside the scope of a writing tool. | Students submit through their university's plagiarism system. GTD focuses on writing quality, not policing. |
| **Real-time collaborative editing** | Multi-user real-time sync is extremely complex (OT/CRDT algorithms). This is Overleaf's core feature. GTD is a single-user AI assistant. | Git-based version control. Students can share their repo with advisors. |
| **Literature search / paper discovery** | Building a search engine over academic papers (like Semantic Scholar, Elicit, SciSpace) is a massive scope expansion. | Users find papers themselves and add to `.bib`. GTD manages what's in the `.bib`, not what's on the internet. |
| **Full automatic thesis generation (one-click)** | Gatsbi and ThesisAI promise one-click paper generation. This produces shallow, hallucination-prone content. A thesis requires deep engagement with the material. | Chapter-by-chapter pipeline with human review at every stage. The student remains the author; GTD is the assistant. |
| **Presentation/slides generation** | Beamer slides from thesis content is a common request but is a separate product. Scope creep. | Focus on the thesis document. Slides can be a future standalone tool. |
| **Docker-based compilation** | Adds complexity for users who may not have Docker. TeX Live is already the standard. Docker adds a dependency without clear benefit for the target user. | Document TeX Live/MiKTeX installation requirements clearly. |
| **Zotero API integration** | Requires OAuth setup, API key management, handling Zotero's API rate limits. `.bib` export is simpler and works with ANY reference manager. | `.bib` file import. Works with Zotero, Mendeley, JabRef, and manual entry. |
| **Grammar/spell checking** | Grammarly, LanguageTool, and Overleaf's AI Assist already do this well. Reimplementing grammar checking adds no value. | Focus on academic-level review: argumentation, methodology, coherence. Let existing tools handle grammar. |
| **Visual LaTeX editor (WYSIWYG)** | Building a visual LaTeX editor is a massive engineering effort (Overleaf Visual Editor, LyX). GTD operates in Claude Code's terminal. | Users edit `.tex` files in their preferred editor (VS Code + LaTeX Workshop, Overleaf, etc.). GTD generates and modifies the files. |
| **AI-powered paraphrasing/rewriting** | Ethically problematic in academic context. Paraphrasing tools risk academic integrity violations. GTD generates original drafts, not rewritten copies. | Writer agent produces original academic prose based on the beat sheet and framework. No paraphrase mode. |

## Feature Dependencies

```
Thesis Init (/gtd:new-thesis)
  |
  +--> Canonical Documents (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md)
  |       |
  |       +--> Chapter Planning (/gtd:plan-chapter)
  |       |       |
  |       |       +--> Chapter Writing (/gtd:write-chapter)
  |       |       |       |
  |       |       |       +--> Chapter Review (/gtd:review-chapter)
  |       |       |               |
  |       |       |               +--> Continuity Loop (canonical doc updates)
  |       |       |                       |
  |       |       |                       +--> Next Chapter Planning (cycle repeats)
  |       |       |
  |       |       +--> Citation Validation (requires .bib)
  |       |
  |       +--> Pre-planning Discussion (/gtd:discuss-chapter)
  |
  +--> Reference Management (/gtd:add-reference)
  |       |
  |       +--> .bib File (required by writer + reviewer)
  |       |
  |       +--> DOI Metadata Fetch (Crossref API)
  |       |
  |       +--> PDF Metadata Extraction (fallback)
  |
  +--> Figure Management (/gtd:add-figure)
  |       |
  |       +--> Figure Catalog (FIGURES.md)
  |       |
  |       +--> Figure Generation (Excalidraw, Python, TikZ, Mermaid)
  |       |
  |       +--> Figure Export Pipeline (requires Python scripts)
  |
  +--> LaTeX Compilation (/gtd:compile)
  |       |
  |       +--> Figure Pre-processing (export pipeline must run first)
  |       |
  |       +--> pdflatex + bibtex/biber (requires TeX Live)
  |
  +--> Progress Dashboard (/gtd:progress)
          |
          +--> Reads chapter status from project state
```

**Key dependency chains:**

1. **Canonical Docs --> Planning --> Writing --> Review --> Continuity Loop** - The core pipeline. Each step depends on the previous. Cannot write without a plan, cannot review without written content, cannot update framework without review.
2. **Reference Management --> Writer Agent** - Writer needs `.bib` entries to cite. References should be added before or during chapter writing.
3. **Figure Management --> Compilation** - Figures must be generated/exported before `pdflatex` can compile them. The pre-processing pipeline is a prerequisite.
4. **FRAMEWORK.md --> Every Chapter After the First** - The continuity loop creates the inter-chapter coherence. Without framework updates, later chapters lose coherence with earlier ones.

## MVP Recommendation

**Prioritize (Phase 1 - Core Pipeline):**

1. **Thesis initialization with canonical documents** - Foundation for everything else. Without FRAMEWORK.md, STYLE_GUIDE.md, and STRUCTURE.md, no agent can function.
2. **Chapter planning (beat sheet)** - The planner agent is the entry point to writing. Without structured planning, writing quality degrades significantly.
3. **Chapter writing (Wave 1 + Wave 2)** - The writer agent producing valid LaTeX is the core deliverable. Must produce compilable `.tex` files with `\cite{}`, `\ref{}`, proper environments.
4. **Citation validation against `.bib`** - Non-negotiable for trust. Every `\cite{}` must resolve. This is the anti-hallucination baseline.
5. **Basic `.bib` file import** - Read existing `.bib` files. No DOI fetch or PDF extraction yet, just read what's there.
6. **LaTeX compilation** - Users must see their PDF. `latexmk` wrapper to handle multi-pass compilation.

**Prioritize (Phase 2 - Review & Consistency):**

7. **Chapter review (adversarial, 4 categories)** - The reviewer agent that checks citations, methodology, coherence, formatting. This is what makes GTD more than a text generator.
8. **Continuity loop (framework-keeper + summary-writer)** - Enables cross-chapter coherence. Without this, multi-chapter theses lose consistency.
9. **Progress dashboard** - Simple but valuable. Shows chapter status at a glance.
10. **Pre-planning discussion** - Helps students think through their chapter before planning.

**Defer (Phase 3 - Enhanced Reference & Figure Management):**

11. **DOI-based reference enrichment** - Nice to have, Crossref API is straightforward but not blocking.
12. **PDF metadata extraction** - Useful fallback but complex (GROBID dependency). Most users have `.bib` files.
13. **Figure generation pipeline** - High complexity, multiple format support. Core writing pipeline works without automated figure generation (users can add figures manually).
14. **Figure catalog and reference validation** - Valuable but not blocking for initial chapters.

**Defer (Phase 4 - Polish & Advanced Features):**

15. **Multi-format figure export pipeline** (Excalidraw, Python, Mermaid pre-processing)
16. **University template marketplace/library** (beyond abnTeX2 + custom)
17. **Advanced norm enforcement** (ABNT NBR 10520:2023 specific rules beyond what abnTeX2 handles)

## Sources

- [Overleaf Features Overview](https://www.overleaf.com/about/features-overview) - Feature baseline for LaTeX editing tools
- [Overleaf AI Features](https://www.overleaf.com/about/ai-features) - AI capabilities in the market leader
- [PaperDebugger (arXiv 2512.02589)](https://arxiv.org/abs/2512.02589) - Multi-agent LaTeX academic writing assistant
- [Gatsbi AI Paper Writer](https://www.gatsbi.com/ai-paper-writer) - AI-powered academic writing with agents
- [Thesify](https://www.thesify.ai/) - AI academic writing review tool
- [Paperpal](https://paperpal.com/paperpal-for-students) - AI academic writing assistant
- [Better BibTeX for Zotero](https://retorque.re/zotero-better-bibtex/) - Zotero-LaTeX bridge standard
- [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) - DOI metadata retrieval
- [Kroki](https://kroki.io/) - Unified diagram generation API
- [abnTeX2 (CTAN)](https://ctan.org/pkg/abntex2) - ABNT formatting for LaTeX
- [Enago Academy - AI Hallucinations](https://www.enago.com/academy/ai-hallucinations-research-citations/) - 40% of AI citations are wrong
- [MIT Writing Dashboard](https://mitcommlab.mit.edu/aeroastro/2025/06/05/keep-track-of-your-thesis-with-a-writing-dashboard/) - Progress tracking concept
- [LaTeX Workshop VS Code](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) - Local LaTeX editing standard
- [Paperguide AI](https://paperguide.ai/blog/ai-tools-for-academic-writing/) - AI academic writing tools landscape
