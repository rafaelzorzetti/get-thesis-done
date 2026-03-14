# Phase 5: Figure Management - Research

**Researched:** 2026-03-13
**Domain:** Excalidraw export tooling, TikZ integration, LaTeX figure environments, figure catalog validation
**Confidence:** MEDIUM (Excalidraw export tooling is the main risk area)

## Summary

Phase 5 adds figure management to GTD: a `/gtd:add-figure` command that registers figures in FIGURES.md, an Excalidraw export pipeline in `preProcessFigures()`, TikZ inline compilation support, and `\ref{fig:*}` cross-reference validation against the catalog. The existing codebase provides solid scaffolding -- the `figures/` directory, `FIGURES.md` template, and `preProcessFigures()` no-op hook are already in place from Phase 1/2.

The main technical risk is Excalidraw export on headless WSL2/Linux. There is no official `@excalidraw/cli` package from the Excalidraw team. The recommended approach is a two-tier strategy: **primary tool is `excalirender`** (self-contained Linux x64 binary, v1.10.5, supports PNG/SVG/PDF directly, no browser needed), with **fallback to the `excalidraw-to-svg` + `rsvg-convert` pipeline** (npm package for SVG, then system tool for PDF). TikZ figures need no pre-processing -- they compile inline with pdflatex, and the main consideration is adding `\graphicspath` and optional `tikz` package loading to the main.tex template.

**Primary recommendation:** Use excalirender as the Excalidraw export tool, with the SVG-intermediate pipeline as documented fallback. Model the `/gtd:add-figure` command and workflow after the existing `/gtd:add-reference` pattern. Implement `validate-figs` as a new CLI command following the `validate-refs` code pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIG-01 | `/gtd:add-figure` creates and registers figures in FIGURES.md catalog | Command definition pattern from `add-reference.md`, workflow pattern from `add-reference` workflow, FIGURES.md template already exists with correct columns |
| FIG-02 | System supports Excalidraw figures (`.excalidraw` -> exported to PDF/PNG) | excalirender (self-contained binary, PDF/PNG/SVG output) as primary tool; `excalidraw-to-svg` + `rsvg-convert` as fallback; `preProcessFigures()` no-op hook at line 1020 ready to implement |
| FIG-03 | System supports TikZ/PGF figures (LaTeX-native, compiled inline) | TikZ compiles inline via pdflatex -- needs `\usepackage{tikz}` in main.tex preamble and `\input{}` pattern for standalone .tikz files; optional tikz externalize for caching |
| FIG-04 | FIGURES.md tracks: ID, caption, chapter, type, source, status | Template already scaffolded with exact columns (ID, Caption, Chapter, Type, Source File, Status); types: excalidraw/tikz/static; statuses: planned/created/exported/included |
| FIG-05 | System validates all `\ref{fig:*}` have corresponding figures in catalog | New `validate-figs` CLI command following `validate-refs` pattern (line 1275); regex `\\ref\{fig:([^}]+)\}` to extract references; parse FIGURES.md markdown table for registered IDs |
</phase_requirements>

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| excalirender | v1.10.5 | Export .excalidraw -> PNG/PDF/SVG | Self-contained Linux x64 binary, no browser required, supports PDF directly, batch mode with -r flag |
| rsvg-convert | system | SVG -> PDF conversion (fallback) | Part of librsvg2-bin, standard Linux package, used by excalidraw_export for PDF output |
| Node.js built-ins (fs, path, child_process) | 18+ | CLI tool implementation | Zero-dependency policy -- all file operations and subprocess calls use Node built-ins |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| excalidraw-to-svg | latest | .excalidraw -> SVG (fallback path) | Only if excalirender is unavailable; used via npx for zero-install |
| librsvg2-bin (apt) | system | Provides rsvg-convert for SVG->PDF | Only needed for fallback SVG pipeline; excalirender handles PDF directly |
| tikz (LaTeX package) | texlive | Inline TikZ/PGF figure compilation | Already included in texlive-full; add `\usepackage{tikz}` to main.tex preamble |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| excalirender | excalidraw-brute-export-cli | Requires Playwright + headless Firefox (~400MB), heavy for a thesis tool |
| excalirender | excalidraw_export (npm) | Requires node-canvas native deps (libcairo2-dev etc.) and rsvg-convert for PDF; more failure modes |
| excalirender | excalidraw-cli (tommywalkie) | Experimental, home-made renderer, may not match Excalidraw rendering exactly |
| Single tool | Two-step SVG pipeline | More moving parts but provides redundancy; good as documented fallback |

### Installation

**excalirender (primary -- user installs once):**
```bash
curl -fsSL https://raw.githubusercontent.com/JonRC/excalirender/main/install.sh | sh
```

**Fallback tools (if excalirender unavailable):**
```bash
# SVG intermediate path
npx excalidraw-to-svg  # zero-install via npx
sudo apt-get install librsvg2-bin  # provides rsvg-convert
```

**LaTeX packages (typically already present with texlive-full):**
```latex
\usepackage{tikz}
\usepackage{graphicx}  % already in main.tex template
```

## Architecture Patterns

### Project Structure (thesis side)

```
src/
  figures/                     # All figure source files
    fig-system-arch.excalidraw # Excalidraw source files
    fig-data-flow.tikz         # TikZ source files (standalone)
    fig-photo-lab.png          # Static pre-made images
    exports/                   # Generated exports (gitignored or tracked)
      fig-system-arch.pdf      # Excalidraw -> PDF export
      fig-system-arch.png      # Excalidraw -> PNG export
  chapters/
    01-introduction.tex        # Uses \includegraphics{} or \input{}
  main.tex                     # Has \graphicspath{{figures/}{figures/exports/}}
.planning/
  FIGURES.md                   # Figure catalog (source of truth)
```

### Pattern 1: Command + Workflow + CLI (from existing add-reference pattern)

**What:** Three-layer architecture matching the existing `/gtd:add-reference` pattern:
1. **Command definition** (`commands/gtd/add-figure.md`) -- declarative spec with allowed tools
2. **Workflow** (`get-thesis-done/workflows/add-figure.md`) -- step-by-step orchestration
3. **CLI commands** (`gtd-tools.js`) -- mechanical operations (register-figure, validate-figs)

**When to use:** Always. This is the established GTD pattern.

**Example command definition (modeled on add-reference.md):**
```markdown
---
name: gtd:add-figure
description: Create and register a figure in the thesis figure catalog
argument-hint: "<figure-id> --type <excalidraw|tikz|static> --chapter <N> --caption <text>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---
```

### Pattern 2: FIGURES.md Catalog as Source of Truth

**What:** FIGURES.md markdown table serves as the authoritative registry for all figures. The CLI reads/writes this file for registration and validation.

**When to use:** Every figure operation reads from or writes to FIGURES.md.

**FIGURES.md row format (already defined in template):**
```markdown
| ID | Caption | Chapter | Type | Source File | Status |
|----|---------|---------|------|-------------|--------|
| fig:system-arch | System architecture overview | 3 | excalidraw | figures/fig-system-arch.excalidraw | created |
| fig:data-flow | Data processing pipeline | 4 | tikz | figures/fig-data-flow.tikz | included |
| fig:lab-setup | Laboratory setup photograph | 2 | static | figures/fig-lab-setup.png | included |
```

### Pattern 3: preProcessFigures() Export Pipeline

**What:** The existing `preProcessFigures()` no-op at line 1020 of gtd-tools.js gets implemented to:
1. Read FIGURES.md, find all entries with type=excalidraw
2. For each, check if export is stale (source newer than export)
3. Run excalirender (or fallback) to produce PDF/PNG
4. Update status in FIGURES.md from "created" to "exported"

**When to use:** Called automatically during `gtd-tools compile` (line 619).

**Example implementation skeleton:**
```javascript
function preProcessFigures(cwd) {
  const figuresPath = path.join(cwd, '.planning', 'FIGURES.md');
  const figuresContent = safeReadFile(figuresPath);
  if (!figuresContent) return { processed: 0, errors: [] };

  const figures = parseFiguresCatalog(figuresContent);
  const excalidrawFigs = figures.filter(f => f.type === 'excalidraw');
  const errors = [];
  let processed = 0;

  for (const fig of excalidrawFigs) {
    const srcPath = path.join(cwd, 'src', fig.sourceFile);
    const exportPath = path.join(cwd, 'src', 'figures', 'exports', fig.id + '.pdf');

    if (!fs.existsSync(srcPath)) {
      errors.push(`Source file not found: ${fig.sourceFile}`);
      continue;
    }

    // Check if export is stale
    if (fs.existsSync(exportPath)) {
      const srcStat = fs.statSync(srcPath);
      const expStat = fs.statSync(exportPath);
      if (srcStat.mtimeMs <= expStat.mtimeMs) continue; // up to date
    }

    // Try excalirender first, then fallback
    try {
      execSync(`excalirender "${srcPath}" -o "${exportPath}"`, { stdio: 'pipe' });
      processed++;
    } catch {
      // Fallback: excalidraw-to-svg + rsvg-convert
      try {
        const svgPath = exportPath.replace('.pdf', '.svg');
        execSync(`npx excalidraw-to-svg "${srcPath}" "${svgPath}"`, { stdio: 'pipe' });
        execSync(`rsvg-convert -f pdf -o "${exportPath}" "${svgPath}"`, { stdio: 'pipe' });
        processed++;
      } catch (err) {
        errors.push(`Failed to export ${fig.id}: ${err.message}`);
      }
    }
  }

  return { processed, errors };
}
```

### Pattern 4: LaTeX Figure Environments

**What:** Standard LaTeX patterns for including different figure types in chapters.

**Excalidraw/Static figures (includegraphics):**
```latex
\begin{figure}[htb]
  \caption{\label{fig:system-arch}System architecture overview}
  \begin{center}
    \includegraphics[width=0.8\textwidth]{exports/fig-system-arch}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}
```

**TikZ figures (inline from .tikz file):**
```latex
\begin{figure}[htb]
  \caption{\label{fig:data-flow}Data processing pipeline}
  \begin{center}
    \input{figures/fig-data-flow.tikz}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}
```

**Critical ordering for abnTeX2:** `\caption{\label{}}` comes BEFORE the image content (abnTeX2 places captions above figures per ABNT norms). The `\legend{}` command (abnTeX2-specific) goes after the image for source attribution.

### Pattern 5: validate-figs CLI Command

**What:** New CLI command following the `validate-refs` pattern (line 1275). Scans .tex files for `\ref{fig:*}` and cross-checks against FIGURES.md.

**Regex patterns needed:**
```javascript
// Extract figure references from .tex files
const figRefPattern = /\\ref\{fig:([^}]+)\}/g;

// Also catch \autoref (used by abnTeX2)
const autorefPattern = /\\autoref\{fig:([^}]+)\}/g;

// Extract figure labels from .tex files (to detect labels without catalog entry)
const figLabelPattern = /\\label\{fig:([^}]+)\}/g;

// Parse FIGURES.md table rows
const catalogRowPattern = /^\|\s*fig:(\S+)\s*\|/gm;
```

### Anti-Patterns to Avoid

- **Hardcoding excalirender path:** Use `which excalirender` or PATH lookup; the user may install it anywhere. If not found, provide installation instructions (like the latexmk pattern at line 597).
- **Requiring Excalidraw export tool at install time:** The tool should be optional -- only required when the user actually has .excalidraw files and runs compile. Follow the poppler-utils pattern from add-reference (check at runtime, provide install instructions on failure).
- **Putting exports in the same directory as sources:** Use a separate `exports/` subdirectory to keep generated files distinct from source files. This makes .gitignore patterns cleaner.
- **Modifying .tex files from the figure pipeline:** The pipeline only manages FIGURES.md and the export process. Chapter .tex files are the writer agent's domain.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excalidraw rendering | Custom JSON parser + canvas renderer | excalirender binary | Excalidraw rendering is complex (Rough.js hand-drawn style, fonts, arrows, connectors); third-party tools handle this |
| SVG to PDF conversion | Custom SVG parser | rsvg-convert (librsvg2-bin) | SVG rendering with correct fonts, scaling, and color spaces is a solved problem |
| Markdown table parsing | Full markdown parser | Simple regex on known table format | FIGURES.md has a fixed, known schema; a regex split on `|` is sufficient and keeps zero-dependency policy |
| LaTeX reference extraction | Full LaTeX parser | Regex patterns on `\ref{fig:*}` | For the specific task of extracting figure references, regex is adequate (same approach used by validate-refs) |
| TikZ compilation | Custom TikZ compiler | pdflatex (already used by compile pipeline) | TikZ compiles inline -- no separate tool needed |

**Key insight:** The Excalidraw export is the ONLY part of this phase that needs external tooling. Everything else (catalog management, validation, TikZ support) is pure Node.js file operations and regex, matching the existing codebase patterns.

## Common Pitfalls

### Pitfall 1: excalirender Binary Not Found at Compile Time
**What goes wrong:** User creates Excalidraw figures but hasn't installed excalirender. Compile fails with cryptic error.
**Why it happens:** excalirender is not an npm dependency (it's a standalone binary installed via curl).
**How to avoid:** Check for excalirender at the start of `preProcessFigures()`. If not found AND there are .excalidraw figures to process, return a clear error with installation instructions. If no .excalidraw figures exist, skip silently.
**Warning signs:** `which excalirender` returns non-zero exit code.

### Pitfall 2: Stale Exports After Source File Edit
**What goes wrong:** User edits .excalidraw file but the exported PDF is stale. LaTeX compiles with old figure.
**Why it happens:** The export step wasn't triggered because compile wasn't run, or mtime comparison failed.
**How to avoid:** Always compare source file mtime with export mtime in `preProcessFigures()`. If source is newer, re-export. Log which figures were re-exported.
**Warning signs:** Export file exists but has older mtime than source.

### Pitfall 3: Missing \graphicspath in main.tex
**What goes wrong:** LaTeX can't find figure files referenced by `\includegraphics{}`.
**Why it happens:** The current main.tex template doesn't include `\graphicspath{}`. When chapters use `\includegraphics{exports/fig-name}`, LaTeX searches relative to main.tex location.
**How to avoid:** Add `\graphicspath{{figures/}{figures/exports/}}` to the main.tex template/preamble. This lets chapters reference figures by filename without full path.
**Warning signs:** LaTeX error "File `figures/exports/fig-name' not found."

### Pitfall 4: Caption/Label Ordering in abnTeX2
**What goes wrong:** Figure numbering or cross-references break.
**Why it happens:** In abnTeX2 (following ABNT norms), `\caption` comes BEFORE the figure content (caption above the figure), and `\label` must be inside or immediately after `\caption`. Placing `\caption` after `\includegraphics` puts it below (non-ABNT compliant).
**How to avoid:** Document the correct ordering in code examples and validate in the add-figure workflow. Pattern: `\caption{\label{fig:id}Caption text}` then image content then `\legend{Fonte: ...}`.
**Warning signs:** Figures without captions above them; `\ref{fig:*}` returning "??" in compiled PDF.

### Pitfall 5: TikZ Package Not Loaded
**What goes wrong:** `\begin{tikzpicture}` fails with "Environment tikzpicture undefined."
**Why it happens:** The current main.tex template does not include `\usepackage{tikz}`.
**How to avoid:** Add `\usepackage{tikz}` to main.tex when a TikZ figure is registered. Or add it unconditionally to the template (tikz is part of texlive-full, no extra install needed).
**Warning signs:** LaTeX compilation error mentioning undefined tikzpicture environment.

### Pitfall 6: Figure ID Conventions Inconsistent
**What goes wrong:** `\ref{fig:system-arch}` in .tex doesn't match `system_arch` in FIGURES.md.
**Why it happens:** No ID normalization -- users might use hyphens, underscores, or camelCase inconsistently.
**How to avoid:** Enforce kebab-case IDs (lowercase, hyphens) in the add-figure command. Normalize input: `systemArch` -> `system-arch`, `system_arch` -> `system-arch`. The `fig:` prefix is added automatically by the LaTeX `\label{}` -- store only the bare ID in FIGURES.md (e.g., `system-arch` not `fig:system-arch`).
**Warning signs:** Validation reports missing figures that actually exist under a different ID format.

## Code Examples

### Parsing FIGURES.md Table

```javascript
// Parse the Figures table from FIGURES.md content
// Returns array of { id, caption, chapter, type, sourceFile, status }
function parseFiguresCatalog(content) {
  const figures = [];
  // Find the Figures table (between ## Figures and ## Tables)
  const figSection = content.match(/## Figures[\s\S]*?(?=## Tables|$)/);
  if (!figSection) return figures;

  const lines = figSection[0].split('\n');
  for (const line of lines) {
    // Skip header row, separator row, empty rows, comments
    if (!line.startsWith('|') || line.match(/^\|[-\s|]+\|$/) || line.match(/^\|\s*ID\s*\|/)) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 6 && cells[0]) {
      figures.push({
        id: cells[0],
        caption: cells[1],
        chapter: cells[2],
        type: cells[3],
        sourceFile: cells[4],
        status: cells[5],
      });
    }
  }
  return figures;
}
```

### Adding a Row to FIGURES.md

```javascript
// Append a figure entry to the Figures table in FIGURES.md
function appendFigureEntry(content, entry) {
  const newRow = `| ${entry.id} | ${entry.caption} | ${entry.chapter} | ${entry.type} | ${entry.sourceFile} | ${entry.status} |`;

  // Find the empty row in the Figures table and replace it, or append before ## Tables
  const emptyRowPattern = /(\| *\| *\| *\| *\| *\| *\|)/;
  if (content.match(emptyRowPattern)) {
    // Replace first empty row
    return content.replace(emptyRowPattern, newRow);
  }

  // Append before ## Tables section
  const tablesIdx = content.indexOf('## Tables');
  if (tablesIdx !== -1) {
    return content.slice(0, tablesIdx) + newRow + '\n' + content.slice(tablesIdx);
  }

  return content + '\n' + newRow;
}
```

### Extracting Figure References from .tex Files

```javascript
// Extract all \ref{fig:*} and \autoref{fig:*} from .tex content
function extractFigureRefs(texContent) {
  const refs = new Set();
  const patterns = [
    /\\ref\{fig:([^}]+)\}/g,
    /\\autoref\{fig:([^}]+)\}/g,
    /\\Autoref\{fig:([^}]+)\}/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(texContent)) !== null) {
      refs.add(match[1]);
    }
  }
  return refs;
}

// Extract all \label{fig:*} from .tex content
function extractFigureLabels(texContent) {
  const labels = new Set();
  const pattern = /\\label\{fig:([^}]+)\}/g;
  let match;
  while ((match = pattern.exec(texContent)) !== null) {
    labels.add(match[1]);
  }
  return labels;
}
```

### Excalidraw Export with Fallback

```javascript
// Export a single .excalidraw file to PDF
// Returns { success: boolean, method: string, error?: string }
function exportExcalidraw(srcPath, exportPath) {
  // Ensure export directory exists
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });

  // Try excalirender first (preferred -- self-contained binary)
  try {
    execSync('which excalirender', { stdio: 'pipe' });
    execSync(`excalirender "${srcPath}" -o "${exportPath}"`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    return { success: true, method: 'excalirender' };
  } catch {
    // excalirender not found or failed -- try fallback
  }

  // Fallback: excalidraw-to-svg + rsvg-convert
  try {
    execSync('which rsvg-convert', { stdio: 'pipe' });
  } catch {
    return {
      success: false,
      method: 'none',
      error: 'No Excalidraw export tool found. Install one of:\n'
        + '  excalirender: curl -fsSL https://raw.githubusercontent.com/JonRC/excalirender/main/install.sh | sh\n'
        + '  rsvg-convert: sudo apt-get install librsvg2-bin',
    };
  }

  try {
    const svgPath = exportPath.replace(/\.pdf$/, '.svg');
    execSync(`npx --yes excalidraw-to-svg "${srcPath}" "${path.dirname(svgPath)}"`, {
      stdio: 'pipe',
      timeout: 60000,
    });
    execSync(`rsvg-convert -f pdf -o "${exportPath}" "${svgPath}"`, {
      stdio: 'pipe',
      timeout: 15000,
    });
    return { success: true, method: 'excalidraw-to-svg + rsvg-convert' };
  } catch (err) {
    return { success: false, method: 'fallback', error: err.message };
  }
}
```

### LaTeX Figure Snippets for add-figure Workflow

```latex
% Excalidraw/Static figure (after export to PDF)
% abnTeX2 pattern: caption ABOVE figure, legend BELOW
\begin{figure}[htb]
  \caption{\label{fig:FIGURE_ID}CAPTION_TEXT}
  \begin{center}
    \includegraphics[width=0.8\textwidth]{exports/FIGURE_ID}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}

% TikZ figure (inline from .tikz file)
\begin{figure}[htb]
  \caption{\label{fig:FIGURE_ID}CAPTION_TEXT}
  \begin{center}
    \input{figures/FIGURE_ID.tikz}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}

% Reference in text (any chapter)
conforme ilustrado na \autoref{fig:FIGURE_ID}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mermaid/Python for diagrams | Excalidraw for hand-drawn, TikZ for precise | 2024-2025 | Excalidraw's JSON format is well-suited for version control; TikZ remains gold standard for technical diagrams in LaTeX |
| excalidraw-cli (node-canvas) | excalirender (Bun binary) | Feb 2026 (v1.10.5) | Self-contained binary eliminates node-canvas dependency issues (libcairo2 etc.) |
| Manual SVG->PDF pipelines | excalirender direct PDF output | 2025+ | Single-tool solution replaces multi-step pipeline |
| tikzexternalize for caching | Optional optimization | N/A | Not needed for v1 -- thesis figures are typically <20; externalize is a v2 optimization |

**Not needed for v1 (deferred):**
- tikz externalize (caching compiled TikZ): Only beneficial with 50+ complex TikZ figures
- Python/matplotlib figure generation: Deferred to FIG-V2-01
- Mermaid diagram support: Deferred to FIG-V2-02

## Open Questions

1. **excalirender Font Rendering on WSL2**
   - What we know: excalirender bundles its own renderer (Rough.js + node-canvas). It claims "self-contained" binary. Released Feb 2026 (v1.10.5).
   - What's unclear: Whether Excalidraw's handwritten font (Virgil) renders correctly in the binary, or if it falls back to system fonts. Font appearance in exported PDFs for academic documents.
   - Recommendation: Include a verification step in the plan -- after installing excalirender, export a test .excalidraw file and visually inspect the PDF. If fonts are wrong, the fallback pipeline (excalidraw-to-svg with `--embed-fonts` + rsvg-convert) may produce better results.

2. **Export Directory Conventions**
   - What we know: Source files go in `src/figures/`. Exports need to be findable by `\includegraphics`.
   - What's unclear: Whether to use `src/figures/exports/` (separate subdir) or export alongside sources. Whether to git-track exports or gitignore them.
   - Recommendation: Use `src/figures/exports/` and git-track the exports. Thesis compilation should not require re-export tools -- checking out the repo and running `latexmk` should work. This matches how most LaTeX projects handle generated figures.

3. **ID Format: With or Without `fig:` Prefix in FIGURES.md**
   - What we know: LaTeX uses `\label{fig:id}` and `\ref{fig:id}`. The template shows `ID` column without specifying format.
   - What's unclear: Whether to store `fig:system-arch` or `system-arch` in FIGURES.md.
   - Recommendation: Store the bare ID (e.g., `system-arch`) in FIGURES.md. The `fig:` prefix is a LaTeX namespace convention added by the environments. Validation maps `\ref{fig:X}` -> looks up `X` in catalog. This is simpler and avoids redundancy.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none -- uses `node --test` directly |
| Quick run command | `node --test get-thesis-done/bin/gtd-tools.test.js` |
| Full suite command | `node --test get-thesis-done/bin/gtd-tools.test.js` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIG-01 | add-figure registers figure in FIGURES.md with correct columns | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "register-figure"` | No -- Wave 0 |
| FIG-02 | preProcessFigures exports .excalidraw to PDF (mocked) | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "preprocess.*excalidraw"` | No -- Wave 0 |
| FIG-03 | TikZ figures registered with type=tikz, no export needed | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "tikz"` | No -- Wave 0 |
| FIG-04 | parseFiguresCatalog parses FIGURES.md table correctly | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "parse.*catalog"` | No -- Wave 0 |
| FIG-05 | validate-figs finds orphaned refs and missing catalog entries | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "validate-figs"` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test get-thesis-done/bin/gtd-tools.test.js`
- **Per wave merge:** `node --test get-thesis-done/bin/gtd-tools.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `get-thesis-done/bin/gtd-tools.test.js` -- test file referenced in package.json but does not exist yet; needs creation with test infrastructure (helpers, temp project setup) following gwd-tools.test.js patterns
- [ ] Test fixtures: sample .excalidraw file, sample .tikz file, sample FIGURES.md with entries, sample .tex files with `\ref{fig:*}`
- [ ] Mock strategy for excalirender/rsvg-convert (external binaries) -- tests should not require these installed; mock `execSync` or test the parsing/validation logic separately from the export execution

## Sources

### Primary (HIGH confidence)

- [excalirender GitHub](https://github.com/JonRC/excalirender) - Installation, CLI usage, v1.10.5, Linux x64 binary, PDF/PNG/SVG support
- [Excalidraw JSON Schema docs](https://docs.excalidraw.com/docs/codebase/json-schema) - .excalidraw file format structure
- [PGF/TikZ Externalization Library](https://tikz.dev/library-external) - tikzexternalize documentation, -shell-escape, prefix option
- [abnTeX2 model commands](https://github.com/abntex/abntex2/blob/master/doc/latex/abntex2/examples/abntex2-modelo-include-comandos.tex) - `\caption`, `\label`, `\legend{Fonte:}` ordering per ABNT norms
- [Overleaf: Figures in LaTeX Thesis](https://www.overleaf.com/learn/latex/How_to_Write_a_Thesis_in_LaTeX_(Part_3)%3A_Figures%2C_Subfigures_and_Tables) - Standard `\begin{figure}` patterns, `\graphicspath` usage
- [Ubuntu manpage: rsvg-convert](https://manpages.ubuntu.com/manpages/jammy/man1/rsvg-convert.1.html) - SVG to PDF conversion, install via `librsvg2-bin`

### Secondary (MEDIUM confidence)

- [excalidraw-brute-export-cli GitHub](https://github.com/realazthat/excalidraw-brute-export-cli) - Playwright-based alternative, Node 18+ support
- [excalidraw_export npm](https://www.npmjs.com/package/excalidraw_export) - SVG+PDF export with rsvg-convert dependency, font handling notes
- [excalidraw-to-svg GitHub](https://github.com/JRJurman/excalidraw-to-svg) - Node.js library, npx CLI usage, SVG-only output

### Tertiary (LOW confidence)

- excalirender WSL2 font rendering -- not directly verified; the binary claims self-contained but font bundling for Virgil/Cascadia is undocumented; needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - excalirender is the best option found but has modest adoption (recent tool, ~2026); TikZ/LaTeX patterns are HIGH confidence
- Architecture: HIGH - directly follows established GTD patterns (add-reference command/workflow/CLI, validate-refs for validation)
- Pitfalls: HIGH - identified from real codebase analysis and LaTeX/abnTeX2 documentation
- Excalidraw export: MEDIUM - excalirender is well-designed but WSL2 font rendering and edge cases are unverified

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days -- Excalidraw tooling moves fast; re-check excalirender releases if starting implementation after this date)
