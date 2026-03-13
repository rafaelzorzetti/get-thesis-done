# Pitfalls Research

**Domain:** AI-powered multi-agent academic thesis writing system (LaTeX output)
**Researched:** 2026-03-13
**Confidence:** HIGH (verified across multiple authoritative sources)

## Critical Pitfalls

### Pitfall 1: LLM Citation Hallucination

**What goes wrong:**
LLMs fabricate academic references that look plausible but do not exist. Studies show GPT-4o fabricates roughly 1 in 5 citations, with 56% of all generated citations containing errors or being entirely fake. Less-studied topics see fabrication rates near 30%. The AI generates realistic-looking BibTeX entries with plausible author names, journal titles, and years -- but the papers do not exist.

**Why it happens:**
LLMs are pattern completers, not fact retrievers. They predict what a citation "should look like" based on training data patterns rather than looking up actual publications. Citation hallucination is a fundamental property of autoregressive generation, not a bug that prompting alone can fix.

**How to avoid:**
- NEVER let agents generate new BibTeX entries from scratch. The reference-manager agent must only cite from the user's imported .bib file.
- Implement a hard validation gate: every `\cite{key}` in generated LaTeX must match an existing entry in the .bib file. If it does not match, the compilation must fail with a clear error.
- The writer agent's prompt must explicitly constrain it: "Only use citation keys from REFERENCES.md / the .bib file. Never invent a citation."
- Build a citation validation pass into the review pipeline that cross-checks every `\cite{}` against the .bib before any compilation.

**Warning signs:**
- `\cite{}` keys appear in generated text that are not in the .bib file
- Citation keys follow suspiciously "neat" patterns (e.g., `smith2023deep`, `jones2024machine`) rather than actual Zotero export keys
- Writer agent produces citations for claims that the user's reference set does not cover

**Phase to address:**
Phase 1 (Core foundation). This is the single most dangerous pitfall. The reference-manager agent and citation validation must be built before any writing pipeline runs. The writer agent's system prompt must be hardened against hallucination from day one.

---

### Pitfall 2: Agent Drift and Error Cascading in the 7-Agent Pipeline

**What goes wrong:**
In a multi-agent system, a single agent's mistake propagates through the chain. The planner produces a slightly off beat sheet, the writer amplifies the error, the reviewer builds on the flawed context, and the framework-keeper codifies the mistake into the canonical documents. Research shows multi-agent error rates can multiply by 17x compared to well-designed alternatives. Agent drift -- progressive degradation of behavior over extended interactions -- can affect nearly half of long-running agents, reducing task success rates by 42%.

**Why it happens:**
Three compounding mechanisms: (1) Autoregressive reinforcement -- each agent's output becomes the next agent's input, so small errors compound. (2) Context window pollution -- as interaction histories grow, signal-to-noise ratio degrades. (3) Inter-agent misalignment -- agents "talk past each other" when their output formats or assumptions diverge, which is the single most common failure mode in production multi-agent systems.

**How to avoid:**
- Use typed schemas at every agent boundary. The planner's output format, the writer's chapter format, the reviewer's feedback format must all be strictly defined -- not freeform prose.
- Build explicit validation gates between agents. The writer should not receive planner output that fails schema validation.
- Implement "behavioral anchors" through the canonical documents (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md). These serve as external memory resistant to incremental drift.
- Design the pipeline as functional planes (planner -> writer -> reviewer), not a "bag of agents" where everyone talks to everyone.
- Log intermediate state at every agent boundary for debugging.

**Warning signs:**
- Later chapters drift in terminology, style, or argumentative framing compared to earlier ones
- The reviewer stops catching real issues and produces generic praise
- FRAMEWORK.md accumulates contradictions over multiple updates
- Agent outputs become increasingly verbose or formulaic

**Phase to address:**
Phase 1 (Agent architecture). The agent boundary contracts and validation gates must be designed before building individual agents. Retrofitting structured communication into a freeform system is a rewrite.

---

### Pitfall 3: LaTeX Special Character Escaping Failures

**What goes wrong:**
LLMs generate text containing unescaped LaTeX special characters (`_`, `%`, `&`, `#`, `$`, `~`, `^`, `{`, `}`, `\`), causing compilation to fail with cryptic errors. This is particularly insidious because the text looks correct in the prompt/output but breaks when pdflatex processes it. URLs with underscores, percentages in data, ampersands in institution names -- all are landmines.

**Why it happens:**
LLMs are trained on mixed corpora (plain text, Markdown, LaTeX) and frequently output text that is valid in one format but not another. When asked to write LaTeX, they often produce content that is correct prose but invalid TeX. The writer agent must produce text that is simultaneously good academic prose AND valid LaTeX -- a dual constraint that LLMs routinely violate.

**How to avoid:**
- Build a LaTeX sanitization layer that runs after every writer agent output, before compilation. This layer must escape special characters in prose sections while preserving intentional LaTeX commands.
- The sanitization must be context-aware: `_` inside `\cite{}` or `\ref{}` is valid, but `_` in body text must become `\_`. This cannot be a naive find-and-replace.
- Test compilation immediately after every chapter generation, not as a final step.
- Include a LaTeX linting pass (chktex or lacheck) in the pipeline.

**Warning signs:**
- Compilation errors like "Missing $ inserted" or "Undefined control sequence"
- Errors that point to lines with URLs, data values, or institution names
- Writer agent produces text that looks correct but has `%` or `&` in prose

**Phase to address:**
Phase 2 (Writer agent implementation). The sanitization layer must be part of the writer agent's post-processing, not an afterthought in the compilation phase.

---

### Pitfall 4: Cross-Chapter Consistency Collapse (Lost in the Middle)

**What goes wrong:**
The thesis loses coherence across chapters. Chapter 3 contradicts the theoretical framework established in Chapter 2. Terminology drifts (calling the same concept by different names). The argumentative thread breaks. The literature review introduces 40 sources but only 15 appear in later chapters. This is the academic equivalent of "the AI lost the plot."

**Why it happens:**
LLMs exhibit a U-shaped attention pattern: they process the beginning and end of their context window reliably but degrade on information in the middle. A thesis has 5-7+ chapters, each 15-30 pages. No single context window can hold the full thesis. When the writer agent generates Chapter 5, it cannot "remember" the precise commitments made in Chapter 2 beyond what is summarized in canonical documents. Strategy and error-accumulation -- not memory exhaustion -- are the primary sources of long-term derailment.

**How to avoid:**
- The canonical documents (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md) are the solution -- but only if they are comprehensive enough to serve as the thesis's "source of truth."
- FRAMEWORK.md must contain: glossary of technical terms with exact definitions, argumentative positions taken, continuity map (what claims were made where).
- The summary-writer agent must produce structured extractions that capture commitments, not just summaries. "Chapter 2 committed to X methodology" not "Chapter 2 discussed methodology."
- Build an inter-chapter consistency check into the reviewer agent: verify terminology matches FRAMEWORK.md glossary, verify all cited sources from lit review appear in later chapters where relevant.

**Warning signs:**
- Same concept referred to by different terms in different chapters
- Chapter introductions that re-explain concepts already defined elsewhere
- Theoretical framework claims that are not carried through to methodology/results
- Reviewer agent stops checking cross-chapter consistency and only reviews within-chapter quality

**Phase to address:**
Phase 1 (Canonical document design) and Phase 3 (Full pipeline integration). The canonical documents must be designed to capture the right information from the start. The cross-chapter consistency check must be built when the full multi-chapter pipeline is assembled.

---

### Pitfall 5: BibTeX/Biber Compilation Sequence Mismanagement

**What goes wrong:**
Citations appear as "[?]" or "undefined reference" warnings in the compiled PDF. The bibliography is missing or incomplete. Cross-references (figure numbers, section numbers, page numbers) are wrong. The user sees a broken PDF and assumes the system is fundamentally broken.

**Why it happens:**
LaTeX compilation with bibliography requires a specific multi-pass sequence: pdflatex -> bibtex/biber -> pdflatex -> pdflatex. Each pass resolves different types of references. Skipping passes or running them in the wrong order produces partial results. Additional complexity: bibtex vs. biber have different capabilities (biber handles UTF-8 natively; bibtex does not). Citation keys are case-sensitive on Linux. The `.aux`, `.bbl`, `.bcf` files can become corrupted and produce stale results.

**How to avoid:**
- Use `latexmk` instead of manually sequencing pdflatex/bibtex passes. Latexmk automatically determines the correct number of passes and handles dependencies. It is already installed on most TeX distributions.
- Always clean auxiliary files before a fresh compilation to avoid stale state.
- Standardize on biber+biblatex (not bibtex+natbib) for UTF-8 support, which is critical for multi-language theses (Portuguese, Spanish, etc.).
- Build the compilation command as: `latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex`
- Test compilation with a minimal document containing citations before building the full pipeline.

**Warning signs:**
- `[?]` appearing in PDF where citations should be
- "Citation undefined" warnings in the log
- Bibliography section is empty despite `.bib` file having entries
- Page numbers and figure numbers are wrong or show "??"

**Phase to address:**
Phase 2 (Compilation pipeline). This must be implemented correctly from the first time `/gtd:compile` is built. Using latexmk from day one prevents the entire class of multi-pass errors.

---

### Pitfall 6: Figure Pipeline Fragility (Excalidraw/Mermaid/Python Export Chain)

**What goes wrong:**
The figure generation pipeline has four different toolchains (Excalidraw, Mermaid, Python/matplotlib, TikZ), each with its own failure modes. Excalidraw CLI export requires a headless browser (Playwright/Puppeteer) and can silently produce broken output. Mermaid CLI (mmdc) produces low-resolution PNGs by default and can "squash" diagrams. Python scripts may have dependency version conflicts. TikZ code generated by LLMs compiles successfully only ~28% of the time for non-trivial diagrams.

**Why it happens:**
Each figure format has a completely different toolchain with different dependencies, different failure modes, and different quality settings. The system must orchestrate Node.js (Excalidraw, Mermaid), Python (matplotlib/plotly), and TeX (TikZ) -- three separate runtime environments. Excalidraw and Mermaid CLI tools are headless-browser-based, which introduces flakiness. LLMs are particularly bad at TikZ because TeX is a low-resource programming language in training data.

**How to avoid:**
- Prioritize figure formats by reliability: static images (highest) > Python/matplotlib (high) > Mermaid (medium) > Excalidraw (medium) > TikZ generated by AI (low).
- For TikZ: provide templates/examples for common diagram types rather than asking the LLM to generate from scratch. Use a library of working TikZ patterns.
- For Mermaid: always export SVG (not PNG) for quality. If PNG is needed, use `-s 3` scale factor.
- For Excalidraw: use `excalidraw_export` (Node package) for SVG/PDF, not browser-based approaches. Test export on CI.
- For Python: pin all dependencies in requirements.txt. Use PDF output (vector) not PNG (raster) for LaTeX.
- Build each format's pipeline independently with its own test suite before integrating.
- Always validate that the output file exists and is non-empty after generation.

**Warning signs:**
- Figure files exist but are 0 bytes or corrupted
- Figures render at wrong size or resolution in the PDF
- TikZ compilation adds 30+ seconds to the build
- Python figure scripts fail silently (matplotlib backend issues)
- `\includegraphics` errors about missing files

**Phase to address:**
Phase 3 (Figure pipeline). Each format should be implemented and tested independently. TikZ generation by AI should be the last figure format supported due to lowest reliability.

---

### Pitfall 7: Zotero .bib Export Encoding Mismatch

**What goes wrong:**
The user exports .bib from Zotero with UTF-8 encoding (Zotero's default). The .bib file contains raw Unicode characters (accented names like "Goncalves" with cedilla, Portuguese titles with tildes). When pdflatex processes this through bibtex, it either garbles the characters, produces encoding errors, or silently drops diacritics. This is especially severe for Brazilian academic work where Portuguese names and titles are pervasive.

**Why it happens:**
BibTeX is a pre-Unicode tool that only handles single-byte characters reliably. Zotero defaults to UTF-8 export, which bibtex cannot process. The user expects "export from Zotero -> use in LaTeX" to just work. It does not without configuration. Biber handles UTF-8 natively but requires biblatex, not natbib.

**How to avoid:**
- Standardize on biber+biblatex from the start (not bibtex+natbib). Biber handles UTF-8 natively.
- In the `/gtd:new-thesis` initialization, configure `\usepackage[utf8]{inputenc}` and `\usepackage[backend=biber]{biblatex}` in the template.
- Build a .bib import validator that checks for encoding issues and warns the user.
- Document clearly: "Export from Zotero as BibLaTeX format (not BibTeX format) for best results."
- For abnTeX2 specifically: verify that the template's bibliography commands are compatible with biblatex/biber, as some abnTeX2 templates assume natbib/bibtex.

**Warning signs:**
- Garbled characters in the bibliography (especially accented Portuguese/Spanish names)
- Missing diacritics in author names
- Compilation warnings about "Invalid UTF-8" or encoding
- References that compile on macOS (more lenient) but fail on Linux

**Phase to address:**
Phase 1 (Template and reference system setup). The biber/biblatex decision must be made at project initialization and baked into the template. Switching from bibtex to biber later requires changing the template, the bibliography commands, and potentially the .bib file format.

---

### Pitfall 8: abnTeX2 Template Structural Assumptions

**What goes wrong:**
The AI-generated LaTeX uses standard LaTeX document structure (`\chapter`, `\section`) but abnTeX2 requires specific structural markers (`\pretextual`, `\textual`, `\postextual`) and has its own macros for cover page, abstract, table of contents, etc. Missing `\textual` (or `\mainmatter`) causes the entire document to render as front matter with empty page styles and no page numbers. The `\nota` command conflicts with common user definitions. Geometry options use different names (`up`/`down` vs `top`/`bottom`).

**Why it happens:**
abnTeX2 extends the standard memoir class with ABNT-specific structural requirements that are not part of standard LaTeX knowledge. LLMs trained on general LaTeX will not know abnTeX2-specific commands. The writer agent generates standard LaTeX that is technically valid but structurally incompatible with abnTeX2.

**How to avoid:**
- Build abnTeX2-aware templates that pre-populate all structural markers. The writer agent should only fill in content sections, never structural preamble.
- Create a strict separation: the template handles document structure (preamble, `\pretextual`, `\textual`, `\postextual`, cover, abstract, TOC), and the writer agent only produces chapter content between `\begin{chapter}` markers.
- Include abnTeX2-specific validation in the reviewer agent: check for `\textual` before first chapter, check for proper use of `\imprimircapa`, `\imprimirfolhaderosto`, etc.
- Maintain a known-good abnTeX2 template with all ABNT NBR 14724 requirements pre-configured (margins: 3cm left/top, 2cm right/bottom; font: 12pt; spacing: 1.5).

**Warning signs:**
- PDF has no page numbers
- Cover page is missing or malformed
- Table of contents is empty
- Margins do not match ABNT requirements
- Compilation succeeds but PDF structure is wrong

**Phase to address:**
Phase 1 (Template system). The template must be verified as a complete, ABNT-compliant abnTeX2 document before any AI content is inserted. Test compilation of the empty template must produce a structurally correct (if content-empty) PDF.

---

### Pitfall 9: Figure Path Resolution in Multi-File LaTeX Projects

**What goes wrong:**
`\includegraphics{figures/plot1.pdf}` works when compiling from the project root but fails when compiling from a subdirectory or when using `\input{}` to include chapter files from subdirectories. The figure pipeline generates files in one location but the LaTeX document references them relative to a different location. Using `-output-directory` with pdflatex causes `\includegraphics` to fail even when files exist due to a known bug.

**Why it happens:**
LaTeX resolves `\includegraphics` paths relative to the main `.tex` file, not relative to the file containing the `\includegraphics` command. When chapters are in `chapters/chapter1.tex` and figures are in `figures/`, the path must be `figures/plot1.pdf` (relative to main.tex), not `../figures/plot1.pdf` (relative to the chapter file). This is counterintuitive. The figure pipeline generates files to disk, but the LaTeX reference must match the compilation context.

**How to avoid:**
- Always use `\graphicspath{{./figures/}}` in the main preamble to establish a single, canonical figure directory.
- The figure pipeline must output all generated figures to a single flat directory (no subdirectories).
- Use `\includegraphics{plot1}` without extension -- LaTeX will find .pdf, .png, .eps automatically.
- Never use `-output-directory` with pdflatex (known bug with \includegraphics).
- The figure-manager agent must track both the file system path (for generation) and the LaTeX path (for `\includegraphics`) and ensure they are consistent.

**Warning signs:**
- "File not found" errors during compilation for figures that clearly exist on disk
- Figures work when compiled from one directory but not another
- Different behavior on Windows vs. Linux (path separators)

**Phase to address:**
Phase 2 (Compilation pipeline) and Phase 3 (Figure pipeline integration). Path resolution must be tested with multi-chapter documents, not just single-file tests.

---

### Pitfall 10: LLM-Generated TikZ That Compiles But Looks Wrong

**What goes wrong:**
The LLM generates TikZ code that compiles without errors but produces a diagram that is visually incorrect -- wrong layout, overlapping labels, missing elements, incorrect relationships. Because TikZ compilation is part of the LaTeX build (no separate validation step), the error is only visible when a human inspects the PDF. Benchmarks show LLMs successfully customize TikZ in only ~28% of cases.

**Why it happens:**
TikZ is a low-resource language in LLM training data. Unlike HTML where you can "inspect element," TikZ has no intrinsic mapping between visual output and code. LLMs cannot "see" what their TikZ code produces. Complex diagrams require precise coordinate calculations that LLMs perform unreliably. Small coordinate errors produce dramatically wrong visual output.

**How to avoid:**
- Maintain a curated library of working TikZ templates for common academic diagram types (flowcharts, system architectures, timelines, comparison tables, mathematical diagrams).
- The figure-manager agent should select and adapt templates rather than generate TikZ from scratch.
- For novel diagrams, prefer Mermaid (simpler syntax, more predictable output) or Python/matplotlib over TikZ.
- When TikZ must be used, generate iteratively: produce code, compile to a standalone PDF, present to user for visual verification before including in thesis.
- Consider: is TikZ necessary at all? Excalidraw can produce many of the same diagram types with higher reliability.

**Warning signs:**
- TikZ code that is unusually long (>50 lines) for a simple diagram
- Multiple `\node` commands with hardcoded absolute coordinates
- Diagrams that compile but the user has never visually inspected

**Phase to address:**
Phase 3 (Figure pipeline). TikZ should be the last figure format implemented due to its low reliability with AI generation. Build the template library before enabling freeform generation.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Freeform agent output (no schemas) | Faster initial development | 17x error amplification, impossible to debug agent boundaries | Never -- schema design is the foundation |
| bibtex instead of biber | Works with more legacy templates | No UTF-8 support, breaks with Portuguese/accented names | Only if a specific university template absolutely requires it |
| Single compilation pass (no latexmk) | Simpler build script | [?] citations, broken cross-refs, user loses trust | Never -- latexmk adds negligible complexity |
| PNG figures instead of PDF/SVG | Simpler pipeline, no vector export needed | Pixelated figures in printed thesis, unprofessional output | Only for screenshots/photos that are inherently raster |
| No canonical document updates between chapters | Faster chapter throughput | Consistency collapses by Chapter 4-5, requires rewrite | Never -- the canonical loop IS the consistency mechanism |
| Hardcoded abnTeX2 assumptions | Faster initial template | Cannot support other university templates or APA format | Only for MVP if explicitly scoped to ABNT only |
| Storing figure generation state in memory only | Simpler implementation | Figures cannot be regenerated after session ends | Never -- FIGURES.md catalog must be the source of truth |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Zotero .bib export | Assuming BibTeX format works with UTF-8 | Use BibLaTeX export format + biber backend |
| Excalidraw CLI | Using browser-based export (flaky, requires display) | Use `excalidraw_export` npm package for headless SVG/PDF |
| Mermaid mmdc | Using default PNG output (low resolution) | Export SVG, or PNG with `-s 3` scale factor |
| Python matplotlib | Using `plt.show()` in headless scripts (blocks forever) | Use `plt.savefig()` with `Agg` backend explicitly set |
| pdflatex + biber | Running biber on `.tex` file instead of `.aux`/`.bcf` | Run `biber main` (no extension) after first pdflatex pass, or use latexmk |
| abnTeX2 + biblatex | Using `\bibliography{}` (natbib) with biblatex | Use `\addbibresource{refs.bib}` and `\printbibliography` |
| Figure paths | Paths relative to chapter subfile | Paths relative to main.tex, using `\graphicspath` |
| TikZ in chapters | Including complex TikZ inline with chapter text | Use `\input{figures/diagram.tikz}` for maintainability |
| Multi-language (babel) | Loading babel after other packages that depend on it | Load babel early in preamble with correct language options |
| Cross-references | Using `\ref{}` without the `hyperref` package | Always include hyperref (loaded last) for clickable refs in PDF |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| PGF/TikZ inline in long documents | Compilation takes 5+ minutes, pdflatex memory exceeded | Externalize TikZ: compile diagrams to standalone PDFs, include as images | >10 TikZ figures or any figure with >100 data points |
| Full .bib file in context window | Agent responses slow, context truncation loses chapter content | Pass only relevant .bib entries to agents, not the full file | .bib file exceeds ~200 entries |
| Regenerating all figures on every compile | Build takes minutes when only text changed | Track figure source modification dates, only regenerate changed figures | >5 generated figures |
| Loading full thesis into context for review | Lost-in-the-middle effect, reviewer misses issues in middle chapters | Review chapter-by-chapter with canonical documents as cross-reference | Thesis exceeds ~40 pages |
| Matplotlib with LaTeX text rendering enabled | Each figure takes 10-30 seconds to generate | Use matplotlib's mathtext (not full LaTeX) unless publication requires it | >10 Python-generated figures |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing AI-generated Python figure scripts without sandboxing | Arbitrary code execution -- LLM could generate `os.system()` or `import subprocess` | Sandbox Python execution. Whitelist allowed imports (matplotlib, numpy, plotly). Never use `exec()` on raw LLM output |
| Including user file paths in LaTeX output | Path disclosure in compiled PDF metadata | Sanitize all paths. Use relative paths only. Strip metadata from PDFs |
| Raw `\input{}` or `\include{}` from AI-generated paths | LaTeX can read arbitrary files via `\input{/etc/passwd}` | Whitelist allowed `\input` targets. Only permit files within the project directory |
| Storing API keys or credentials in thesis project config | Credential exposure in git or shared project | Never store API keys in project files. Use environment variables exclusively |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Compilation fails with cryptic LaTeX errors | User cannot understand what went wrong, loses trust in the tool | Parse pdflatex logs, translate errors to human-readable messages: "Citation 'smith2023' not found in your .bib file" |
| AI writes a full chapter in one shot | User has no control over direction, feels like the AI "took over" | Implement the plan -> discuss -> write pipeline. Show the beat sheet. Let the user approve before full generation |
| No progress visibility during long operations | User thinks the tool is stuck or crashed | Stream progress: "Planning chapter 3... Writing section 3.1... Running citation check..." |
| Reviewer agent always says "looks good" | User never gets real critical feedback, thesis quality suffers | Design reviewer as adversarial by default. It should find problems, not confirm quality. Score each review dimension |
| Figure generation with no preview | User discovers figure looks wrong only after full compilation | Generate and display figure preview before including in thesis |
| Overwriting user's manual LaTeX edits | User loses their careful formatting work | Detect user modifications to .tex files. Warn before overwriting. Use merge strategies, not wholesale replacement |

## "Looks Done But Isn't" Checklist

- [ ] **Citation validation:** Often missing validation that ALL `\cite{}` keys exist in .bib -- verify with `grep -oP '\\cite\{[^}]+\}' chapters/*.tex | sort -u` cross-checked against .bib keys
- [ ] **Cross-references:** `\ref{fig:X}` and `\label{fig:X}` pairs often have orphans -- verify every `\ref` has a matching `\label` and vice versa
- [ ] **Bibliography completeness:** .bib entries exist but may have empty required fields (missing year, missing author) -- validate .bib structure
- [ ] **Figure catalog sync:** FIGURES.md lists figures that no longer exist, or generated figures not in FIGURES.md -- reconcile catalog with file system
- [ ] **Multi-pass compilation:** PDF compiles "successfully" but has [?] marks -- verify zero "undefined reference" warnings in log
- [ ] **ABNT compliance:** Document compiles and looks reasonable but margins, spacing, or font size are wrong -- verify against NBR 14724 specifications (3cm/2cm margins, 12pt font, 1.5 spacing)
- [ ] **Language consistency:** Thesis is in Portuguese but some auto-generated labels appear in English ("Chapter" instead of "Capitulo", "Figure" instead of "Figura") -- verify babel/polyglossia language setting
- [ ] **Abstract in both languages:** Brazilian theses require abstract in Portuguese AND English -- verify both exist in pre-textual elements
- [ ] **Figure format quality:** Figures compile into PDF but are raster (pixelated when zoomed) -- verify vector formats (PDF/SVG) for diagrams, raster only for photos
- [ ] **Canonical document freshness:** FRAMEWORK.md was updated for chapters 1-3 but not for chapters 4-5 -- verify update timestamps match chapter completion

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Citation hallucination in generated chapters | MEDIUM | Run citation validator, collect all unmatched `\cite{}`, remove or replace with valid keys from .bib, re-review affected paragraphs |
| Agent drift across chapters | HIGH | Re-generate canonical documents from scratch by reading all existing chapters, then use updated canonicals to review and regenerate drifted chapters |
| LaTeX special character errors in bulk | LOW | Run sanitization script across all .tex files, recompile, review diff for false positives (legitimate LaTeX commands that were over-escaped) |
| Wrong compilation sequence (stale references) | LOW | Clean all auxiliary files (`latexmk -C`), recompile from scratch with latexmk |
| Figure path resolution failures | LOW | Consolidate all figures to single directory, update all `\includegraphics` paths, set `\graphicspath` |
| Encoding issues in .bib file | MEDIUM | Re-export from Zotero with correct encoding settings, or run encoding conversion script (`iconv`), switch to biber if not already |
| abnTeX2 structural incompatibility | HIGH | Rebuild document from known-good template, migrate content chapter by chapter, verify pre-textual/textual/post-textual structure |
| Cross-chapter inconsistency discovered late | HIGH | Freeze writing, rebuild FRAMEWORK.md by auditing all existing chapters, create consistency report, revise affected chapters one by one |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Citation hallucination | Phase 1: Core Foundation | Zero `\cite{}` keys missing from .bib after any write operation |
| Agent drift / error cascading | Phase 1: Agent Architecture | Agent boundary schemas defined and validated; no freeform agent-to-agent communication |
| LaTeX special character escaping | Phase 2: Writer Agent | All generated .tex files compile without escaping errors; chktex produces zero warnings for special characters |
| Cross-chapter consistency | Phase 1 (design) + Phase 3 (implementation) | Terminology in Chapter N matches FRAMEWORK.md glossary; no contradictions flagged by reviewer |
| Compilation sequence errors | Phase 2: Compilation Pipeline | latexmk produces PDF with zero "undefined reference" warnings on first run |
| Figure pipeline fragility | Phase 3: Figure System | Each figure format has independent test suite; all test figures compile into final PDF correctly |
| Zotero .bib encoding | Phase 1: Template Setup | Test .bib with Portuguese/accented characters compiles correctly with biber |
| abnTeX2 structural issues | Phase 1: Template System | Empty template compiles to structurally correct ABNT-compliant PDF |
| Figure path resolution | Phase 2 + Phase 3 | Multi-chapter document with figures from all formats compiles correctly |
| TikZ generation quality | Phase 3: Figure System (last) | Template library covers common diagram types; freeform generation is discouraged, not default |

## Sources

- [ChatGPT's Hallucination Problem: Study Finds More Than Half of AI's References Are Fabricated](https://studyfinds.org/chatgpts-hallucination-problem-fabricated-references/) -- GPT-4o citation error rates
- [Why Ghost References Still Haunt Us in 2025](https://aarontay.substack.com/p/why-ghost-references-still-haunt) -- Broader context on citation hallucination
- [Why LLMs Invent Academic Citations](https://dev.to/olivier-coreprose/why-llms-invent-academic-citations-that-don-t-exist-and-how-to-stop-them-lc4) -- Root cause analysis and mitigations
- [Multi-Agent Workflows Often Fail (GitHub Blog)](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/) -- Typed schemas, action schemas, MCP enforcement
- [Why Your Multi-Agent System is Failing: The 17x Error Trap](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/) -- Bag of agents antipattern, topology of coordination
- [Agent Drift: Quantifying Behavioral Degradation in Multi-Agent LLM Systems](https://arxiv.org/abs/2601.04170) -- 42% success rate reduction, behavioral anchors
- [Why Do Multi-Agent LLM Systems Fail (arXiv)](https://arxiv.org/pdf/2503.13657) -- Comprehensive taxonomy of multi-agent failures
- [Context Degradation Syndrome](https://jameshoward.us/2024/11/26/context-degradation-syndrome-when-large-language-models-lose-the-plot/) -- Lost-in-the-middle effect
- [LLM Code Customization with Visual Results: A Benchmark on TikZ](https://arxiv.org/abs/2505.04670) -- 28% success rate for TikZ customization
- [Zotero BibTeX Export Encoding Discussion](https://forums.zotero.org/discussion/24136/default-encoding-in-bibtex-export) -- UTF-8 default, biber recommendation
- [Overleaf: Bibliography Management with BibTeX](https://www.overleaf.com/learn/latex/Bibliography_management_with_bibtex) -- Compilation sequence
- [LaTeX Special Characters (Georgia State University)](https://research.library.gsu.edu/latex/special_characters) -- Escaping rules
- [Figure Paths in LaTeX](https://texblog.org/2017/12/05/the-path-to-your-figures/) -- graphicspath best practices
- [Matplotlib PGF Backend Documentation](https://matplotlib.org/stable/users/explain/text/pgf.html) -- PGF limitations with pdflatex
- [Mermaid CLI Issues: Low Resolution](https://github.com/mermaid-js/mermaid-cli/issues/715) -- PNG quality problems
- [Excalidraw Export CLI](https://github.com/Timmmm/excalidraw_export) -- Headless SVG/PDF export tool
- [latexmk Documentation](https://mg.readthedocs.io/latexmk.html) -- Automated multi-pass compilation

---
*Pitfalls research for: AI-powered multi-agent academic thesis writing system (LaTeX output)*
*Researched: 2026-03-13*
