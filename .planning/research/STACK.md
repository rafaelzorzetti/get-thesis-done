# Technology Stack

**Project:** Get Thesis Done (GTD)
**Researched:** 2026-03-13
**Overall confidence:** HIGH

---

## Design Principle: Zero-Runtime-Dependency Node.js + Minimal Python

GTD follows the same architectural pattern as GWD (Get Writing Done): a zero-runtime-dependency npm package that installs as markdown-based slash commands/skills for Claude Code (and Gemini CLI, OpenCode). The Node.js CLI tool (`gtd-tools.js`) uses only Node.js built-ins. Python is isolated to the figure generation pipeline with its own `requirements.txt`. This is not a web app, not a framework project, not an API server. It is a CLI toolbox that orchestrates AI agents through prompt files.

---

## Recommended Stack

### Core Runtime & Distribution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js | >=18.0.0 | CLI runtime, compilation orchestration | Built-in `util.parseArgs()` stable since v18+, `node:test` runner, `child_process` for LaTeX. GWD uses >=16.7 but GTD needs parseArgs. | HIGH |
| npm | >=9.0.0 | Package distribution | Primary distribution channel for `/gtd:*` commands installed via `npx get-thesis-done`. Proven pattern from GWD. | HIGH |
| Python | >=3.10 | Figure generation scripts | Required for matplotlib/plotly. 3.10+ for match statements and modern type hints. | HIGH |
| pip | (bundled) | Python dependency management | `requirements.txt` for figure pipeline. No need for Poetry/uv -- scope is tiny (5-8 packages). | HIGH |

### CLI Tooling (Node.js -- Zero Dependencies)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `node:fs` | built-in | File I/O for .tex, .bib, .md files | Zero-dependency approach matches GWD pattern. No external fs libraries needed. | HIGH |
| `node:path` | built-in | Cross-platform path resolution | Standard for file path operations. | HIGH |
| `node:child_process` | built-in | Spawn pdflatex, bibtex, mmdc, Python scripts | `spawn()` for streaming output from LaTeX compilation. `execSync()` for quick checks. | HIGH |
| `node:util.parseArgs()` | built-in (Node 18+) | CLI argument parsing | Zero-dependency alternative to commander/yargs. Sufficient for GTD's simple CLI interface (`gtd-tools init`, `gtd-tools progress`, etc.). GWD already uses manual argv parsing. | HIGH |
| `node:test` | built-in (Node 18+) | Testing | Zero-dependency test runner. GWD already uses `node --test`. No need for Jest/Vitest. | HIGH |
| `node:assert/strict` | built-in | Test assertions | Strict mode avoids legacy loose equality. Sufficient for CLI testing needs. | HIGH |
| ANSI escape codes | n/a | Terminal colors | GWD uses raw ANSI codes (`\x1b[36m` etc.) directly -- no chalk/picocolors needed for this scope. Continue the pattern. | HIGH |

### LaTeX Compilation Pipeline

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pdflatex | (TeX Live) | .tex to .pdf compilation | User's local TeX Live/MiKTeX. GTD does NOT bundle TeX. Compilation orchestrated via `child_process.spawn()`. | HIGH |
| bibtex / biber | (TeX Live) | Bibliography processing | Required for .bib reference resolution. GTD runs the pdflatex->bibtex->pdflatex->pdflatex sequence. | HIGH |
| latexmk | (TeX Live) | Automated compilation (optional) | Included in TeX Live. Handles dependency tracking and multi-pass compilation automatically. GTD should support both: manual sequence for transparency, `latexmk -pdf` as a convenience flag. | HIGH |
| abnTeX2 | v1.9.7+ | Default Brazilian academic template | ABNT compliance for Brazilian theses. Included in TeX Live. GTD ships a `main.tex` template that uses `abntex2` document class. | HIGH |

**Compilation strategy:** GTD's `gtd-tools compile` should default to `latexmk -pdf -interaction=nonstopmode` when available, falling back to manual `pdflatex -> bibtex -> pdflatex -> pdflatex` sequence. Check for latexmk with `which latexmk`.

### BibTeX/Reference Management (Node.js)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom .bib parser | n/a | Parse .bib files, validate `\cite{}` | BibTeX format is well-defined. A focused regex+state-machine parser (~200 lines) avoids npm dependencies while covering GTD's needs: extract keys, titles, authors, years. GWD's frontmatter parser is a precedent for this approach. | HIGH |
| Crossref REST API | v1 | DOI-to-metadata lookup | Free, no API key required. `https://api.crossref.org/works/{DOI}` returns JSON with full citation metadata. Use Node.js built-in `fetch()` (Node 18+). Convert response to .bib entry. | HIGH |
| `citation-js` | ^0.7.22 | BibTeX/DOI format conversion (OPTIONAL) | **The one optional dependency.** If custom .bib parsing proves insufficient for edge cases (LaTeX markup in entries, cross-references, string variables), citation-js handles all of it. Supports BibTeX<->CSL-JSON<->APA/Vancouver. Plugin architecture: `@citation-js/plugin-bibtex`, `@citation-js/plugin-doi`. Consider adding only if custom parser hits walls. | MEDIUM |

**Recommendation:** Start with custom .bib parser (zero-dep). If edge cases mount (LaTeX commands in fields, @string macros, cross-refs), add citation-js as the first and only runtime dependency.

### Figure Pipeline (Multi-Format)

#### Excalidraw Export

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `excalidraw-brute-export-cli` | ^0.4.0 | .excalidraw -> SVG/PNG | Uses Playwright+Firefox for pixel-perfect export identical to Excalidraw UI. The most reliable option. Install as devDependency or expect user to install globally. | MEDIUM |
| **Alternative:** `@vraksha/excalidraw-cli` | latest | Lighter .excalidraw export | Lighter weight, but less battle-tested. Consider if Playwright dependency is too heavy. | LOW |

**Excalidraw strategy:** Excalidraw export is the heaviest dependency in the figure pipeline (Playwright pulls ~100MB). Two approaches:
1. **Recommended:** Document as optional. If user has `.excalidraw` files, they install `excalidraw-brute-export-cli` globally.
2. **Alternative:** Ship a simple Node.js script using `@excalidraw/excalidraw` React component in a headless JSDOM context -- fragile, not recommended.

#### Mermaid Export

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@mermaid-js/mermaid-cli` | ^11.12.0 | .mmd -> SVG/PNG/PDF | Official CLI. `mmdc -i input.mmd -o output.png`. Well-maintained, 108 dependents. Uses Puppeteer internally. | HIGH |

**Mermaid strategy:** `npx @mermaid-js/mermaid-cli mmdc -i file.mmd -o file.png` avoids global install. GTD's figure pipeline calls this via `child_process.spawn()`.

#### Python Figures (matplotlib/plotly)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| matplotlib | >=3.10.0 | Static publication-quality plots | Industry standard for academic figures. Direct PDF/PNG output. Handles LaTeX math in labels. | HIGH |
| SciencePlots | >=2.2.0 | Academic figure styling | Pre-configured matplotlib styles for IEEE, Nature, thesis. `plt.style.use('science')`. Requires LaTeX for font rendering. | HIGH |
| plotly | >=6.5.0 | Interactive -> static figure export | For data-heavy visualizations. Export static images via Kaleido. | MEDIUM |
| kaleido | >=1.0.0 | Plotly static image export | Required by plotly for PNG/PDF/SVG export. Note: v1.0+ requires Chrome installed (no longer bundled). | MEDIUM |
| numpy | >=1.26.0 | Numerical computation for plots | Ubiquitous dependency of matplotlib. Always needed for data manipulation in figure scripts. | HIGH |
| pandas | >=2.2.0 | Data loading for figures | Read CSV/Excel data for thesis figures. Optional but nearly always needed. | MEDIUM |

#### TikZ/PGF

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TikZ/PGF | (TeX Live) | Inline LaTeX diagrams | Compiled directly by pdflatex -- no pre-processing needed. GTD generates `.tikz` source files that are `\input{}` in chapters. Zero additional tooling. | HIGH |

### Build & Development

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| esbuild | ^0.27.0 | Bundle hooks (if needed) | GWD uses esbuild for hook bundling. GTD may need it for the same purpose. Dev dependency only. | HIGH |
| `node --test` | built-in | Test runner | Zero-dependency. GWD pattern: `"test": "node --test get-thesis-done/bin/gtd-tools.test.js"`. | HIGH |

### Template Engine (for .tex generation)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom string interpolation | n/a | Generate .tex from templates | LaTeX's `{` and `}` conflict with every template engine (Handlebars, Mustache, EJS). Use simple `{{PLACEHOLDER}}` replacement with a custom function (~30 lines). GWD's pattern of shipping static .md templates works; GTD ships static .tex templates with `{{TITLE}}`, `{{AUTHOR}}`, etc. | HIGH |

**Why not Handlebars/EJS:** LaTeX uses `{}` pervasively. Escaping every brace in a LaTeX template is error-prone and defeats the purpose. A simple `template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key])` is safer and clearer.

---

## Python requirements.txt

```
# Figure generation pipeline for Get Thesis Done
matplotlib>=3.10.0
SciencePlots>=2.2.0
numpy>=1.26.0
pandas>=2.2.0
plotly>=6.5.0
kaleido>=1.0.0
```

**Install:** `pip install -r requirements.txt` (or `pip install -r get-thesis-done/requirements.txt` from project root)

---

## package.json (Recommended)

```json
{
  "name": "get-thesis-done",
  "version": "0.1.0",
  "description": "Multi-agent AI thesis writing system producing LaTeX output with reference management and figure generation.",
  "bin": {
    "get-thesis-done": "bin/install.js"
  },
  "files": [
    "bin",
    "commands",
    "get-thesis-done",
    "agents",
    "hooks/dist",
    "latex-templates",
    "figures/scripts"
  ],
  "keywords": [
    "thesis",
    "latex",
    "academic",
    "ai",
    "multi-agent",
    "claude",
    "claude-code",
    "abnt",
    "bibtex",
    "writing-pipeline"
  ],
  "author": "TACHES",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {},
  "devDependencies": {
    "esbuild": "^0.27.0"
  },
  "scripts": {
    "build:hooks": "node scripts/build-hooks.js",
    "prepublishOnly": "npm run build:hooks",
    "test": "node --test get-thesis-done/bin/gtd-tools.test.js"
  }
}
```

**Key design decision:** Zero runtime dependencies. The `dependencies` field stays empty. All functionality comes from Node.js built-ins. External tools (pdflatex, mmdc, Python) are invoked via `child_process`.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| BibTeX parsing | Custom parser | `citation-js` (0.7.22) | Start zero-dep. Add citation-js only if edge cases warrant it. |
| BibTeX parsing | Custom parser | `@retorquere/bibtex-parser` | Powers Better BibTeX for Zotero -- excellent but overkill for key/field extraction. |
| BibTeX parsing | Custom parser | `bibtex-js-parser` | Less maintained, no TypeScript types. |
| CLI args | `util.parseArgs()` | `commander.js` | Adds dependency for ~5 commands. parseArgs covers the need. |
| CLI args | `util.parseArgs()` | `yargs` | Heavy (has sub-dependencies). Overkill for simple CLI. |
| Terminal colors | Raw ANSI codes | `chalk` | GWD already uses raw codes. Consistency over convenience. |
| Terminal colors | Raw ANSI codes | `picocolors` | Tiny (7kB) but still a dependency for what 5 lines of constants achieve. |
| Template engine | Custom `{{}}` replace | `handlebars` | LaTeX `{}` braces conflict. Custom is safer. |
| Template engine | Custom `{{}}` replace | `ejs` | Same brace conflict. `<%= %>` works but ugly in .tex files. |
| LaTeX compilation | `child_process` + latexmk | `node-latex` | Last updated 2021. Thin wrapper adds no value over direct spawn. |
| LaTeX compilation | `child_process` + latexmk | `node-latex-compiler` | Uses Tectonic (not TeX Live). Different ecosystem, user likely already has TeX Live. |
| Test runner | `node --test` | Jest | External dependency. GWD pattern uses built-in. |
| Test runner | `node --test` | Vitest | Designed for Vite projects. Overkill here. |
| Excalidraw export | `excalidraw-brute-export-cli` | Custom JSDOM render | Fragile, incomplete rendering, font issues. |
| Python figures | matplotlib + SciencePlots | R / ggplot2 | Python is the standard. Adding R would split the ecosystem. |
| Plotly export | kaleido | orca (legacy) | Deprecated in favor of kaleido since plotly 6.x. |
| Mermaid export | `@mermaid-js/mermaid-cli` | Custom renderer | Official CLI exists. No reason to reinvent. |

---

## Architecture Alignment with GWD

GTD mirrors GWD's proven patterns:

| Pattern | GWD | GTD |
|---------|-----|-----|
| Runtime dependencies | 0 | 0 (target) |
| Dev dependencies | esbuild | esbuild |
| CLI tool | `gwd-tools.js` (CommonJS, Node built-ins) | `gtd-tools.js` (CommonJS, Node built-ins) |
| Testing | `node --test gwd-tools.test.js` | `node --test gtd-tools.test.js` |
| Agent definitions | Markdown files in `agents/` | Markdown files in `agents/` |
| Commands | Markdown files in `commands/` | Markdown files in `commands/` |
| Install mechanism | `bin/install.js` (copies to .claude/) | `bin/install.js` (copies to .claude/) |
| Template rendering | YAML frontmatter regex parser | Custom `{{}}` for .tex + YAML frontmatter parser |

**New in GTD (not in GWD):**

| Addition | Technology | Rationale |
|----------|-----------|-----------|
| LaTeX compilation orchestration | `child_process.spawn()` + latexmk/pdflatex | Core feature: compile .tex -> .pdf |
| .bib parsing and validation | Custom regex+state parser | Validate `\cite{}` against .bib keys |
| DOI metadata fetching | `fetch()` + Crossref API | Convert DOI -> .bib entry |
| Figure pre-processing pipeline | `child_process` calling mmdc, Python, etc. | Multi-format figure export before compilation |
| Python figure scripts | matplotlib, plotly, SciencePlots | Generate publication-quality figures |

---

## External Tool Requirements (User-Installed)

GTD requires these tools installed on the user's system (not bundled):

| Tool | Purpose | How to Check | Install Guide |
|------|---------|-------------|---------------|
| TeX Live / MiKTeX | LaTeX compilation | `pdflatex --version` | `sudo apt install texlive-full` (Linux) / MacTeX (macOS) / MiKTeX (Windows) |
| Python 3.10+ | Figure scripts | `python3 --version` | `sudo apt install python3` / python.org |
| pip | Python packages | `pip --version` | Bundled with Python 3.4+ |
| Node.js 18+ | CLI runtime | `node --version` | nodejs.org / nvm |
| latexmk (optional) | Auto-compilation | `latexmk --version` | Included in TeX Live full |
| Chrome (optional) | Kaleido/Plotly export | N/A | Only if using plotly figure export |

---

## Version Pinning Strategy

**npm (package.json):** Use `^` (caret) for semver ranges. Zero runtime deps means no version conflict risk.

**pip (requirements.txt):** Use `>=` minimum versions. Academic figure generation is not a long-running service -- reproducibility matters less than "it works on the student's machine."

**TeX Live:** No version pinning. Users install whatever their OS provides. GTD's .tex templates use standard LaTeX2e commands compatible with TeX Live 2020+.

---

## Sources

### Verified (HIGH confidence)
- [Node.js v25 Documentation - child_process](https://nodejs.org/api/child_process.html)
- [Node.js v25 Documentation - util.parseArgs](https://nodejs.org/api/util.html)
- [Node.js v25 Documentation - test runner](https://nodejs.org/api/test.html)
- [Crossref REST API Documentation](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
- [abnTeX2 on CTAN](https://ctan.org/pkg/abntex2)
- [abnTeX2 on GitHub](https://github.com/abntex/abntex2)
- [Mermaid CLI on GitHub](https://github.com/mermaid-js/mermaid-cli)
- [@mermaid-js/mermaid-cli on npm](https://www.npmjs.com/package/@mermaid-js/mermaid-cli)
- [esbuild on npm](https://www.npmjs.com/package/esbuild) - v0.27.4
- [matplotlib on PyPI](https://pypi.org/project/matplotlib/) - v3.10.8
- [plotly on PyPI](https://pypi.org/project/plotly/) - v6.5.2
- [SciencePlots on PyPI](https://pypi.org/project/SciencePlots/) - v2.2.1
- [kaleido on PyPI](https://pypi.org/project/kaleido/) - v1.0.0+
- [Citation.js on npm](https://www.npmjs.com/package/citation-js) - v0.7.22
- [latexmk on CTAN](https://ctan.org/tex-archive/support/latexmk)

### Consulted (MEDIUM confidence)
- [excalidraw-brute-export-cli on GitHub](https://github.com/realazthat/excalidraw-brute-export-cli)
- [@retorquere/bibtex-parser on npm](https://www.npmjs.com/package/@retorquere/bibtex-parser)
- [SciencePlots on GitHub](https://github.com/garrettj403/SciencePlots)
- [Plotly static image export docs](https://plotly.com/python/static-image-export/)
- [GWD codebase](https://github.com/rafaelzorzetti/get-writing-done) - package.json, gwd-tools.js patterns
