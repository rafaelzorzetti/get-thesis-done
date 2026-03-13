# Phase 2: Writing Pipeline & Compilation - Research

**Researched:** 2026-03-13
**Domain:** Multi-agent writing pipeline, LaTeX output, citation validation, special character sanitization
**Confidence:** HIGH

## Summary

Phase 2 transforms the scaffolded thesis project (Phase 1) into a functional writing pipeline. The core work involves adapting three GWD agents (planner, writer) and three GWD workflows (discuss-chapter, plan-chapter, write-chapter) from book/Markdown mode to thesis/LaTeX mode, creating three new `/gtd:*` commands to invoke them, adding LaTeX special character sanitization to `gtd-tools.js`, adding citation key validation to `gtd-tools.js`, and wiring the compilation pipeline with a figure pre-processing hook reservation.

The existing GWD reference code is mature and well-structured. The adaptation is primarily a terminology/output-format change (BIBLE.md to FRAMEWORK.md, OUTLINE.md to STRUCTURE.md, Markdown to LaTeX, gwd-tools.js to gtd-tools.js) with thesis-specific additions: planned citations in beat sheets, citation validation against references.bib, methodological arc tracking, and LaTeX-native output. The compilation pipeline already exists from Phase 1 and only needs the sanitization step and figure hook reservation.

The zero-runtime-dependencies constraint means citation key extraction from `.bib` files and LaTeX sanitization must be hand-rolled in `gtd-tools.js`. Both are straightforward -- `.bib` keys follow a simple `@type{key,` pattern, and LaTeX special characters are a fixed set of 10 characters with known escape sequences. The context-aware sanitization (preserving `_` inside `\cite{}`, `\ref{}`, `\label{}`) requires a regex-based approach that identifies LaTeX commands before escaping.

**Primary recommendation:** Structure Phase 2 as 3 plans: (1) Agent adaptations (planner.md + writer.md), (2) Workflows and commands (discuss-chapter, plan-chapter, write-chapter), (3) gtd-tools.js additions (sanitize, cite-keys, summary extract) and compilation updates.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WRITE-01 | `/gtd:discuss-chapter N` captures locked decisions in CONTEXT.md | GWD discuss-chapter.md workflow provides proven pattern; needs OUTLINE.md to STRUCTURE.md terminology swap |
| WRITE-02 | `/gtd:plan-chapter N` creates beat sheet with sections, arguments, planned citations | GWD planner.md + plan-chapter.md; new: planned citations must reference real .bib keys, methodological arc tracking |
| WRITE-03 | `/gtd:write-chapter N` produces LaTeX via Wave 1 + Wave 2 | GWD writer.md + write-chapter.md; output changes from .md to .tex; new: citation validation step |
| WRITE-04 | Writer produces LaTeX-native output | Writer agent adaptation: `\chapter{}`, `\section{}`, `\cite{}`, figure/table environments |
| WRITE-05 | Writer operates in persona mode with anti-pattern suppression | GWD writer.md persona section adapts directly; academic register replaces conversational register |
| WRITE-06 | Each agent spawns with fresh context via `gtd-tools.js context --chapter N` | Already implemented in Phase 1; workflows pass paths to agents, agents load context independently |
| WRITE-07 | `/gtd:progress` shows thesis progress dashboard | Already exists from Phase 1; needs DRAFT.tex detection (currently checks DRAFT.md) |
| COMP-01 | `/gtd:compile` runs latexmk with pdflatex + biber | Already implemented in Phase 1 |
| COMP-02 | Compilation pre-processes figure pipeline before build | Hook reservation only -- actual figure pipeline is Phase 5 |
| COMP-03 | Compilation errors with actionable diagnostics | Already implemented in Phase 1 |
| COMP-04 | LaTeX special character sanitization | New gtd-tools.js `sanitize` command; context-aware escaping |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `node:test` | Built-in (18+) | Test framework | Zero-dependency, already used in GWD reference tests |
| Node.js `node:fs` | Built-in | File operations | Already used throughout gtd-tools.js |
| Node.js `child_process` | Built-in | Git operations, compilation | Already used in gtd-tools.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| latexmk | System | LaTeX compilation | Already wired in Phase 1 compile command |
| biber | System | Bibliography processing | Already configured in main.tex template |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled .bib key extraction | npm `bibtex-parse` | Would violate zero-runtime-dependencies constraint; key extraction is trivial regex |
| Hand-rolled LaTeX sanitization | npm `escape-latex` | Would violate zero-runtime-dependencies; escape-latex is not context-aware anyway |
| Custom YAML frontmatter parser | npm `js-yaml` | Already have working `extractFrontmatter()` in gtd-tools.js |

**Installation:**
```bash
# No new dependencies needed. Phase 2 is pure Markdown/JS file creation.
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
get-thesis-done/
  get-thesis-done/
    bin/
      gtd-tools.js           # ADD: sanitize, cite-keys, summary extract commands
    workflows/
      new-thesis.md           # EXISTS (Phase 1)
      discuss-chapter.md      # NEW: adapted from GWD
      plan-chapter.md         # NEW: adapted from GWD
      write-chapter.md        # NEW: adapted from GWD
  agents/
    planner.md                # REWRITE: thesis/LaTeX adaptation
    writer.md                 # REWRITE: thesis/LaTeX adaptation
    reviewer.md               # UNTOUCHED (Phase 3)
    bible-keeper.md           # UNTOUCHED (Phase 3)
    summary-writer.md         # UNTOUCHED (Phase 3)
  commands/gtd/
    new-thesis.md             # EXISTS (Phase 1)
    progress.md               # EXISTS (Phase 1)
    compile.md                # EXISTS (Phase 1)
    discuss-chapter.md        # NEW
    plan-chapter.md           # NEW
    write-chapter.md          # NEW
```

### Pattern 1: Agent Adaptation (GWD to GTD)

**What:** Systematic find-and-replace plus thesis-specific additions in agent files.
**When to use:** For every agent and workflow being adapted from GWD.

The adaptation follows a consistent mapping:

| GWD Term | GTD Term |
|----------|----------|
| BIBLE.md | FRAMEWORK.md |
| OUTLINE.md | STRUCTURE.md |
| `gwd-tools.js` | `gtd-tools.js` |
| `~/.claude/get-writing-done/bin/gwd-tools.js` | `~/.claude/get-thesis-done/bin/gtd-tools.js` |
| `has_bible` | `has_framework` |
| `has_outline` | `has_structure` |
| `/gwd:*` | `/gtd:*` |
| DRAFT.md | DRAFT.tex |
| DRAFT-w1.md | DRAFT-w1.tex |
| H2 sections (`## Section Title`) | `\section{Section Title}` |
| Markdown prose | LaTeX prose |
| Book-native terminology | Thesis-native terminology |
| `#### Chapter NN:` (OUTLINE.md format) | `### Chapter NN:` (STRUCTURE.md format) |

### Pattern 2: Beat Sheet with Planned Citations (Thesis Extension)

**What:** PLAN.md format extended to include planned citations per section.
**When to use:** In the adapted planner agent.

```markdown
### Section 1: [Section Title]

- **Purpose:** [What this section accomplishes]
- **Key arguments:**
  1. [Claim] -- cite: \cite{silva2023}
  2. [Claim] -- cite: \cite{santos2022, oliveira2021}
- **Planned citations:** [silva2023, santos2022, oliveira2021]
- **Terms to use:** [FRAMEWORK.md glossary terms for this section]
- **Methodology:** [Research method this section employs]
- **Threads:**
  - Advance: [Thread from FRAMEWORK.md continuity map]
  - Reference: [Prior chapter element to echo]
- **Opening:** [How this section begins]
- **Target length:** [Word count]
```

**Critical rule:** Planned citations MUST reference keys that exist in the user's `references.bib`. The planner agent must read .bib keys before planning.

### Pattern 3: LaTeX-Native Writer Output

**What:** Writer produces `.tex` files directly, not Markdown.
**When to use:** In the adapted writer agent (both Wave 1 and Wave 2).

```latex
\chapter{Chapter Title}
\label{chap:chapter-slug}

\section{Section Title}
\label{sec:section-slug}

Opening paragraph with concrete image or question, establishing the section's
contribution to the chapter argument. As \textcite{silva2023} demonstrates,
the claim is grounded in evidence.

The analysis proceeds through careful examination of the evidence. The data
suggest that the hypothesis holds under specific conditions
\cite[p.~45]{santos2022}. This finding is consistent with the broader
theoretical framework established in Chapter~\ref{chap:literature-review}.

\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\textwidth]{figures/figure-name}
  \caption{Figure caption.}
  \label{fig:figure-name}
\end{figure}

\begin{table}[htbp]
  \centering
  \caption{Table caption.}
  \label{tab:table-name}
  \begin{tabular}{lcc}
    \toprule
    Column 1 & Column 2 & Column 3 \\
    \midrule
    Data & Data & Data \\
    \bottomrule
  \end{tabular}
\end{table}
```

### Pattern 4: Context-Aware LaTeX Sanitization

**What:** Post-write sanitization that escapes special characters in prose but preserves them inside LaTeX commands.
**When to use:** As a gtd-tools.js `sanitize` subcommand, run after Wave 2 and before compilation.

The 10 LaTeX special characters and their escape sequences:

| Character | Escape | Notes |
|-----------|--------|-------|
| `&` | `\&` | Common in prose, must escape |
| `%` | `\%` | LaTeX comment char, must escape in prose |
| `$` | `\$` | Math mode delimiter |
| `#` | `\#` | Macro parameter |
| `_` | `\_` | Subscript operator |
| `{` | `\{` | Group opener |
| `}` | `\}` | Group closer |
| `~` | `\textasciitilde{}` | Non-breaking space in LaTeX |
| `^` | `\textasciicircum{}` | Superscript operator |
| `\` | `\textbackslash{}` | Command prefix -- NEVER escape blindly |

**Context-aware approach:**

1. Parse the `.tex` file line by line
2. For each line, identify "protected zones" where special characters are intentional:
   - Inside `\cite{...}`, `\ref{...}`, `\label{...}`, `\textcite{...}` -- underscores in keys
   - Inside `\begin{...}`, `\end{...}` -- environment names
   - Inside `\includegraphics{...}`, `\input{...}`, `\include{...}` -- file paths
   - Inside `$...$` and `\[...\]` -- math mode
   - Lines starting with `%` -- LaTeX comments
   - Inside `\url{...}`, `\href{...}` -- URLs
   - Any `\command` sequence -- the backslash is intentional
3. Only escape characters found OUTSIDE protected zones
4. Return the sanitized content

**Implementation strategy:** Use regex to identify and temporarily replace protected zones with placeholders, escape the remaining text, then restore the protected zones.

```javascript
function sanitizeLatex(content) {
  // Step 1: Identify and protect LaTeX commands and their arguments
  const protectedZones = [];
  let processed = content;

  // Protect: \command{arg}, \command[opt]{arg}, $math$, $$math$$, \[math\]
  // Protect: % comment lines
  // Protect: \begin{env} ... \end{env} names

  const patterns = [
    /\\[a-zA-Z]+\*?(?:\[[^\]]*\])*\{[^}]*\}/g,  // \cmd[opt]{arg}
    /\$\$[\s\S]*?\$\$/g,                           // $$display math$$
    /\$[^$]+\$/g,                                   // $inline math$
    /\\\[[\s\S]*?\\\]/g,                            // \[display math\]
    /^%.*$/gm,                                      // % comments
  ];

  // Step 2: Replace protected zones with placeholders
  for (const pattern of patterns) {
    processed = processed.replace(pattern, (match) => {
      const idx = protectedZones.length;
      protectedZones.push(match);
      return `\x00PROTECTED_${idx}\x00`;
    });
  }

  // Step 3: Escape remaining special characters
  const escapeMap = {
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '_': '\\_',
  };
  // Note: {, }, ~, ^, \ are NOT escaped in prose because they are
  // almost always part of LaTeX syntax. Only &, %, $, #, _ appear
  // accidentally in prose text.

  for (const [char, escape] of Object.entries(escapeMap)) {
    // Only escape if not already escaped (not preceded by \)
    const regex = new RegExp(`(?<!\\\\)\\${char}`, 'g');
    processed = processed.replace(regex, escape);
  }

  // Step 4: Restore protected zones
  processed = processed.replace(/\x00PROTECTED_(\d+)\x00/g, (_, idx) => {
    return protectedZones[parseInt(idx)];
  });

  return processed;
}
```

### Pattern 5: Workflow Command Pattern

**What:** Command files are thin wrappers that reference workflows.
**When to use:** For all three new commands.

```markdown
---
name: gtd:discuss-chapter
description: Discuss a chapter before planning to capture locked decisions
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
[Brief description of what the command does]
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/discuss-chapter.md
@~/.claude/get-thesis-done/templates/structure.md
</execution_context>

<process>
Execute the discuss-chapter workflow from @~/.claude/get-thesis-done/workflows/discuss-chapter.md end-to-end.
</process>
```

### Anti-Patterns to Avoid

- **Converting Markdown to LaTeX after writing:** The writer MUST produce LaTeX directly. A Markdown-to-LaTeX conversion step would lose LaTeX-specific features (environments, cross-references, precise citation commands) and add fragility.
- **Adding npm dependencies for simple tasks:** .bib key extraction and LaTeX sanitization are both < 50 lines of code. Adding npm dependencies violates the project constraint and adds supply chain risk.
- **Blind LaTeX escaping:** Escaping ALL special characters in a .tex file destroys the LaTeX source. Context-aware escaping is mandatory.
- **Hallucinating citation keys:** The writer agent must be constrained to ONLY cite keys from the user's .bib file. The planner's planned citations and the writer's `\cite{}` commands must all be validated.
- **Referencing non-existent CLI commands:** The GWD agents reference `gwd-tools.js commit` but this command does not exist in either GWD or GTD. Agents commit via git directly. Do not propagate this phantom reference.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LaTeX compilation | Custom pdflatex wrapper | `latexmk` (already wired in Phase 1) | latexmk handles multi-pass compilation, biber, and dependency tracking |
| Bibliography processing | Custom .bib reader | biber (configured in main.tex) | biber handles all BibLaTeX complexity including UTF-8, cross-references, sorting |
| YAML frontmatter | New parser | Existing `extractFrontmatter()` in gtd-tools.js | Already handles nested objects, arrays, and multi-line values |
| Template engine | New placeholder system | Existing `processTemplate()` in gtd-tools.js | Already handles `{{PLACEHOLDER}}` replacements |

**Key insight:** The citation key extraction from .bib files IS appropriate to hand-roll because it is a single regex (`/@\w+\{(\S+?),/g`) applied to a text file. Full BibTeX parsing (handling string concatenation, crossref inheritance, LaTeX markup in fields) is NOT needed -- we only need the set of valid citation keys.

## Common Pitfalls

### Pitfall 1: DRAFT.tex vs DRAFT.md Status Detection

**What goes wrong:** The `cmdProgress()` function in gtd-tools.js currently checks for `-DRAFT\.tex$` (line 413), but the GWD writer agent outputs `.md` files. If the new writer agent outputs `.tex` files but the progress command is not updated, status detection breaks.
**Why it happens:** The progress command was written in Phase 1 anticipating `.tex` output, but we need to verify it matches the actual file naming convention.
**How to avoid:** Verify that `cmdProgress()` already checks for `.tex` extension (it does -- line 413 checks `-DRAFT\.tex$/i`). The writer agent must output `NN-01-DRAFT.tex` and `NN-01-DRAFT-w1.tex`.
**Warning signs:** `gtd-tools.js progress` shows a chapter as "planned" when it should be "drafted".

### Pitfall 2: Citation Key Validation Timing

**What goes wrong:** Citations are planned in PLAN.md, written in Wave 1, polished in Wave 2 -- but .bib file may change between planning and writing.
**Why it happens:** The user adds or removes references independently of the writing pipeline.
**How to avoid:** Validate citation keys at two points: (1) during planning (planner reads .bib keys), (2) after Wave 2 (post-write validation). The post-write validation is the authoritative check. If a planned citation key no longer exists in .bib, the writer should note it and the workflow should warn the author.
**Warning signs:** `\cite{key}` in the `.tex` file has no matching entry in `references.bib`.

### Pitfall 3: LaTeX Command Nesting in Sanitization

**What goes wrong:** Nested LaTeX commands like `\textbf{\cite{key_with_underscore}}` cause the sanitizer to escape the underscore inside `\cite{}` because the outer `\textbf{}` is matched first.
**Why it happens:** Simple regex-based protected zone detection doesn't handle arbitrary nesting depth.
**How to avoid:** Process innermost commands first (`.bib` key-bearing commands: `\cite`, `\ref`, `\label`, `\textcite`, `\cites`, `\autocite`, `\parencite`, `\footcite`). Match these specifically before general `\command{}` matching. Alternatively, use a greedy strategy that protects ALL `\command{...}` sequences.
**Warning signs:** Compilation errors on `\cite{}` commands that worked before sanitization.

### Pitfall 4: Phantom CLI Command References

**What goes wrong:** GWD workflows and agents reference `gwd-tools.js commit` which does not exist in either codebase. If copied to GTD, agents will fail trying to run the command.
**Why it happens:** The GWD documentation references a planned but never-implemented CLI commit wrapper.
**How to avoid:** In all GTD agents and workflows, use direct `git add` + `git commit` commands instead of referencing a `gtd-tools.js commit` command. Do NOT create a commit wrapper unless explicitly needed.
**Warning signs:** "Unknown command: commit" errors during agent execution.

### Pitfall 5: STRUCTURE.md Chapter Entry Format Mismatch

**What goes wrong:** The GWD planner extracts chapter entries using `#### Chapter NN:` (H4), but STRUCTURE.md uses `### Chapter NN:` (H3) because theses have no Parts.
**Why it happens:** GWD uses H3 for Parts and H4 for Chapters; GTD drops the Parts level.
**How to avoid:** The `extractChapterStructure()` function in gtd-tools.js already uses a regex pattern `'#### Chapter ' + padded` (line 471). This needs to be changed to `'### Chapter ' + padded` to match STRUCTURE.md's format, OR the function needs to handle both.
**Warning signs:** `context --chapter N` returns null for the chapter structure entry.

### Pitfall 6: Wave 1 Output Extension Mismatch

**What goes wrong:** The workflow expects `.tex` files but agents produce `.md` files (or vice versa) due to inconsistent adaptation.
**Why it happens:** Partial adaptation where some files are updated and others are not.
**How to avoid:** Establish the convention early and enforce it everywhere:
- Wave 1 output: `NN-01-DRAFT-w1.tex`
- Wave 2 output: `NN-01-DRAFT.tex`
- Progress detection regex: `-DRAFT\.tex$`
All three must agree.

## Code Examples

### Citation Key Extraction from .bib File

```javascript
// Source: Hand-rolled for zero-dependency constraint
function extractBibKeys(bibContent) {
  const keys = new Set();
  // Match @type{key, where key is everything up to the first comma
  const pattern = /@\w+\{([^,\s]+)/g;
  let match;
  while ((match = pattern.exec(bibContent)) !== null) {
    keys.add(match[1].trim());
  }
  return keys;
}

// Usage in gtd-tools.js
function cmdCiteKeys(cwd, raw) {
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const content = safeReadFile(bibPath);
  if (!content) error('references.bib not found at src/references.bib');

  const keys = extractBibKeys(content);
  const sortedKeys = [...keys].sort();

  output({
    count: sortedKeys.length,
    keys: sortedKeys,
    bib_path: 'src/references.bib',
  }, raw, sortedKeys.join('\n'));
}
```

### Citation Validation in .tex File

```javascript
// Source: Hand-rolled for zero-dependency constraint
function validateCitations(texContent, validKeys) {
  const issues = [];
  // Match all citation commands: \cite{key}, \cite{k1,k2}, \textcite{key},
  // \cites{k1}{k2}, \autocite{key}, \parencite{key}, \footcite{key}
  const citePattern = /\\(?:text)?cite[sp]?\*?(?:\[[^\]]*\])*\{([^}]+)\}/g;
  let match;
  while ((match = citePattern.exec(texContent)) !== null) {
    const keysStr = match[1];
    const citedKeys = keysStr.split(',').map(k => k.trim());
    for (const key of citedKeys) {
      if (!validKeys.has(key)) {
        issues.push({
          key,
          command: match[0],
          position: match.index,
        });
      }
    }
  }
  return issues;
}
```

### Thesis-Adapted Beat Sheet Format

```markdown
---
type: chapter-plan
chapter: 02
title: "Literature Review"
target_length: 4000-6000
sections: 4
planned_citations: [silva2023, santos2022, oliveira2021, ferreira2020]
created: 2026-03-13
---

# Chapter 02 Plan: Literature Review

## Chapter Thesis

[The single argument this chapter makes -- from STRUCTURE.md chapter entry.]

## Sections

### Section 1: Theoretical Framework

- **Purpose:** Establish the theoretical lens for the entire thesis.
- **Key arguments:**
  1. [Claim] -- cite: \cite{silva2023}
  2. [Claim] -- cite: \cite{santos2022}
- **Planned citations:** [silva2023, santos2022]
- **Terms to use:** [FRAMEWORK.md glossary terms]
- **Methodology:** Literature review -- systematic mapping of key theoretical constructs
- **Threads:**
  - Advance: [Thread from FRAMEWORK.md continuity map]
  - Reference: [Prior chapter element to echo]
- **Opening:** Statement -- direct claim establishing the chapter's theoretical position
- **Target length:** 1000-1500

## Constraints from STRUCTURE.md

### Do NOT Touch
- [Topics reserved for other chapters]

### Must Connect
- Builds on: [Prior chapter reference]
- Sets up: [Future chapter reference]

## Methodological Arc Position

[Where this chapter sits in the thesis's methodological progression.
From STRUCTURE.md Methodological Arc table.]
```

### Command File Template

```markdown
---
name: gtd:write-chapter
description: Plan and write a thesis chapter through the two-wave writing pipeline
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - Glob
  - Grep
---
<objective>
Orchestrate the full chapter writing pipeline: spawn planner for beat sheet,
present plan for approval, spawn writer for Wave 1 (structural draft in LaTeX),
spawn writer for Wave 2 (polished prose in LaTeX), present draft for approval,
run citation validation, and finalize.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/write-chapter.md
</execution_context>

<process>
Execute the write-chapter workflow from @~/.claude/get-thesis-done/workflows/write-chapter.md end-to-end. Preserve all workflow gates.
</process>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Markdown chapter drafts | LaTeX-native chapter drafts | GTD design decision | Writer agent produces .tex directly; no conversion step |
| BIBLE.md | FRAMEWORK.md | GTD design decision | Adds Methodological Commitments section, academic glossary format |
| OUTLINE.md | STRUCTURE.md | GTD design decision | Adds Methodological Arc, thesis-level structure (no Parts) |
| `gwd-tools.js` | `gtd-tools.js` | Phase 1 | Independent CLI, thesis-specific commands |
| bibtex+natbib | biber+biblatex | GTD design decision | UTF-8 support, more citation commands (\textcite, \autocite, etc.) |
| General voice persona | Academic voice persona | GTD design decision | Third person, formal register, hedging for precision (not weakness) |

**Deprecated/outdated:**
- GWD agents reference `gwd-tools.js commit` -- this command was never implemented in either GWD or GTD. Agents use direct git commands.
- GWD writer outputs Markdown with H2 headings for sections -- GTD writer outputs LaTeX with `\section{}`.

## Open Questions

1. **extractChapterStructure() regex pattern**
   - What we know: Current regex in gtd-tools.js line 471 uses `'#### Chapter '` which matches GWD's OUTLINE.md format (H4). STRUCTURE.md uses H3 (`### Chapter`).
   - What's unclear: Whether this was intentionally set to H4 or was copied from GWD without updating.
   - Recommendation: Update to `### Chapter` in the same plan that creates the agents, since the fix is a 1-character change.

2. **Summary extract command timing**
   - What we know: GWD's write-chapter workflow calls `gwd-tools.js summary extract` to scaffold a SUMMARY.md template at finalization. This command exists in GWD but not yet in GTD.
   - What's unclear: Whether to add `summary extract` in Phase 2 or defer to Phase 3 (where summary-writer and framework-keeper are adapted).
   - Recommendation: Add a basic `summary extract` command to gtd-tools.js in Phase 2 so the write-chapter workflow can scaffold the SUMMARY.md template. The summary-writer agent (Phase 3) fills it.

3. **Figure pre-processing hook shape**
   - What we know: COMP-02 requires a hook reservation for figure pre-processing (Phase 5).
   - What's unclear: What exactly the hook should look like -- a function call in the compile pipeline, a separate CLI subcommand, or a configuration entry.
   - Recommendation: Add a clearly-marked no-op function call in `cmdCompile()` with a comment: `// Phase 5: figure pipeline pre-processing runs here`. This is sufficient reservation.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (Node 18+) |
| Config file | None (package.json `test` script) |
| Quick run command | `node --test get-thesis-done/bin/gtd-tools.test.js` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRITE-01 | discuss-chapter workflow produces CONTEXT.md | manual-only | N/A -- workflow is interactive | N/A |
| WRITE-02 | plan-chapter workflow produces PLAN.md | manual-only | N/A -- workflow spawns agents | N/A |
| WRITE-03 | write-chapter workflow produces DRAFT.tex via two waves | manual-only | N/A -- workflow spawns agents | N/A |
| WRITE-04 | Writer output contains LaTeX commands | manual-only | N/A -- agent behavior, not CLI | N/A |
| WRITE-05 | Writer persona mode and anti-patterns | manual-only | N/A -- agent behavior | N/A |
| WRITE-06 | Context assembly per chapter | unit | `node --test get-thesis-done/bin/gtd-tools.test.js` | No -- Wave 0 |
| WRITE-07 | Progress detects DRAFT.tex files | unit | `node --test get-thesis-done/bin/gtd-tools.test.js` | No -- Wave 0 |
| COMP-01 | Compile command runs latexmk | unit | `node --test get-thesis-done/bin/gtd-tools.test.js` | No -- Wave 0 |
| COMP-02 | Figure hook exists in compile pipeline | unit | `node --test get-thesis-done/bin/gtd-tools.test.js` | No -- Wave 0 |
| COMP-03 | Compile diagnostics are actionable | unit | `node --test get-thesis-done/bin/gtd-tools.test.js` | No -- Wave 0 |
| COMP-04 | Sanitize escapes special chars context-aware | unit | `node --test get-thesis-done/bin/gtd-tools.test.js` | No -- Wave 0 |

**Note:** Most WRITE-* requirements are agent/workflow behaviors that cannot be unit-tested. They are verified by running the actual commands. The testable pieces are CLI additions: `sanitize`, `cite-keys`, `summary extract`, and the updated `progress` and `context` commands.

### Sampling Rate

- **Per task commit:** `node --test get-thesis-done/bin/gtd-tools.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `get-thesis-done/bin/gtd-tools.test.js` -- test file must be created (referenced in package.json but does not exist)
- [ ] Tests for `sanitize` command -- context-aware LaTeX escaping
- [ ] Tests for `cite-keys` command -- .bib key extraction
- [ ] Tests for `validate-citations` command -- cross-checking .tex against .bib
- [ ] Tests for `summary extract` command -- SUMMARY.md scaffolding
- [ ] Tests for `progress` with `.tex` draft detection
- [ ] Tests for `extractChapterStructure()` with H3 format

## Sources

### Primary (HIGH confidence)

- Existing codebase: `get-thesis-done/bin/gtd-tools.js` (720 lines) -- full Phase 1 implementation
- Existing codebase: `agents/planner.md`, `agents/writer.md` -- GWD reference agents to adapt
- Existing codebase: `get-writing-done/workflows/discuss-chapter.md`, `plan-chapter.md`, `write-chapter.md` -- GWD reference workflows to adapt
- Existing codebase: `commands/gtd/new-thesis.md`, `progress.md`, `compile.md` -- Phase 1 command format reference
- Existing codebase: `get-thesis-done/templates/` -- LaTeX template format and structure
- `.planning/REQUIREMENTS.md` -- Phase 2 requirement IDs and descriptions
- `.planning/ROADMAP.md` -- Phase 2 goal and success criteria

### Secondary (MEDIUM confidence)

- [escape-latex npm package](https://github.com/dangmai/escape-latex) -- Reference for LaTeX special character list (not used as dependency, but confirms the character set)
- [LaTeX Special Characters - Wikibooks](https://en.wikibooks.org/wiki/LaTeX/Special_Characters) -- Authoritative reference for LaTeX special characters and escape sequences
- [bibtex-parse npm packages](https://www.npmjs.com/search?q=bibtex) -- Surveyed to understand .bib parsing complexity; confirmed key extraction is trivial enough to hand-roll

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all built on existing codebase
- Architecture: HIGH -- direct adaptation of proven GWD patterns with thesis-specific extensions
- Pitfalls: HIGH -- identified from direct code reading, not speculation
- Sanitization approach: MEDIUM -- regex-based context-aware escaping is standard but edge cases may surface in production

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no fast-moving dependencies)
