# Phase 4: Reference Management - Research

**Researched:** 2026-03-13
**Domain:** BibTeX/BibLaTeX reference management, Crossref DOI content negotiation, PDF metadata extraction, citation validation
**Confidence:** HIGH

## Summary

Phase 4 builds a reference management pipeline for the GTD thesis system. Unlike Phases 2 and 3 which adapted existing GWD agents and workflows, Phase 4 is entirely novel -- GWD has no reference management feature. The implementation requires: (1) a `/gtd:add-reference` command and workflow that handles three input modes (.bib file import, DOI fetch via Crossref, PDF metadata extraction), (2) a `reference-manager` agent definition, (3) CLI extensions in gtd-tools.js for reference operations (import-bib, fetch-doi, validate-refs, pdf-refs), and (4) a cross-chapter citation validation + PDF cross-referencing capability.

The critical technical constraint is **zero runtime npm dependencies** (Node.js 18+ built-ins only). This is achievable because: Node.js 18+ has native `fetch()` for Crossref API calls (content negotiation returns BibTeX directly via `Accept: application/x-bibtex` header), BibTeX parsing is simple enough for regex-based extraction (the project already has `extractBibKeys()` in gtd-tools.js), and PDF metadata extraction can delegate to system utilities (`pdfinfo` from poppler-utils for metadata, `pdftotext` for DOI regex scanning in text). The BibTeX writing (assembling entry strings from Crossref JSON or PDF metadata) is string concatenation -- no library needed.

The hardest requirement is REF-03 (PDF metadata extraction). PDF files from different publishers have wildly inconsistent metadata. The recommended approach is a multi-strategy pipeline: (1) check PDF metadata fields via `pdfinfo` for embedded DOI, (2) scan first 2 pages of text via `pdftotext` for DOI regex pattern, (3) if DOI found, fetch full BibTeX from Crossref (reducing to the REF-02 flow), (4) if no DOI found, extract title/author from `pdfinfo` metadata and construct a minimal BibTeX entry that the user must review. This graduated approach means PDF import works well for ~80% of academic papers (those with DOIs) and degrades gracefully for the rest.

**Primary recommendation:** Structure as 2 plans: (1) CLI extensions + reference-manager agent (import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs commands; reference-manager.md agent), (2) add-reference workflow + command + cross-chapter validation integration. CLI first because the workflow and agent both depend on the CLI tools.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REF-01 | `/gtd:add-reference` imports entries from existing .bib file (Zotero/Mendeley export) | BibTeX format is well-defined; parse with regex `@type{key,` pattern (already in `extractBibKeys()`); validate entries, merge into references.bib avoiding duplicates |
| REF-02 | `/gtd:add-reference` fetches BibTeX from DOI via Crossref REST API | Crossref content negotiation with `Accept: application/x-bibtex` header returns BibTeX directly; Node.js 18+ native `fetch()` follows redirects by default; polite pool via `mailto` query param; rate limit: 10 req/s polite pool |
| REF-03 | `/gtd:add-reference` extracts metadata from PDF files and generates .bib entries | Multi-strategy: (1) pdfinfo for embedded DOI in metadata, (2) pdftotext first 2 pages + DOI regex scan, (3) if DOI found -> Crossref fetch, (4) if no DOI -> construct minimal entry from pdfinfo title/author. System tools (poppler-utils) required. |
| REF-04 | Reference-manager validates all `\cite{}` in chapters against `references.bib` | Extend existing `validateCitations()` to work across ALL chapters (not single chapter); scan `src/chapters/*.tex` + `.planning/chapters/*/DRAFT.tex`; report per-chapter and aggregate results |
| REF-05 | System cross-references cited keys with available PDFs in `references/` directory | Scan `src/references/` directory; match filenames to citation keys by convention (key.pdf) or by DOI in PDF metadata; report which keys have PDFs and which do not |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | 18+ | fs, path, child_process, native fetch() | Zero runtime dependencies -- project constraint |
| gtd-tools.js | current | CLI utility -- extend with reference commands | Already has extractBibKeys(), validateCitations() |
| Crossref Content Negotiation | REST API | Fetch BibTeX from DOI | Free, no registration, returns BibTeX directly |

### Supporting (System Utilities)

| Utility | Package | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfinfo | poppler-utils | Extract PDF metadata (title, author, subject, keywords) | REF-03: PDF metadata extraction |
| pdftotext | poppler-utils | Extract text from PDF first pages for DOI scanning | REF-03: DOI regex scan in PDF content |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Crossref content negotiation | Crossref REST API JSON + manual BibTeX assembly | Content negotiation returns BibTeX directly -- simpler |
| pdfinfo + pdftotext | pdf-parse npm package | Violates zero-dependency constraint |
| Custom BibTeX parser | @citation-js/plugin-bibtex | Violates zero-dependency constraint; regex sufficient for import/merge |
| pdfgrep for DOI scan | pdftotext + grep | pdftotext is more commonly installed; same poppler-utils package |

**Installation (system dependencies for REF-03):**
```bash
# Ubuntu/Debian (including WSL2)
sudo apt install poppler-utils

# macOS
brew install poppler

# Verify
pdfinfo -v && pdftotext -v
```

Note: poppler-utils is NOT an npm dependency. It is a system utility that is already present on most academic Linux/WSL2 setups (TeX Live often pulls it in). The CLI should detect its absence and provide a clear error message.

## Architecture Patterns

### Recommended Project Structure

```
agents/
  reference-manager.md         # NEW: Agent for reference validation and management
get-thesis-done/
  workflows/
    add-reference.md           # NEW: Reference import/fetch/extract workflow
  bin/
    gtd-tools.js               # EXTEND: import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs
commands/gtd/
  add-reference.md             # NEW: Command definition for /gtd:add-reference
```

### Pattern 1: Multi-Mode Input Detection

**What:** The `/gtd:add-reference` workflow accepts three input types and auto-detects the mode from the argument.

**When to use:** When the user provides a reference source.

**Detection logic:**
```
Input argument -> Detection:
  *.bib file path      -> MODE: import-bib (REF-01)
  10.XXXX/...          -> MODE: fetch-doi  (REF-02)
  *.pdf file path      -> MODE: pdf-meta   (REF-03)
  URL with doi.org     -> MODE: fetch-doi  (extract DOI from URL)
  Otherwise            -> Ask user to clarify
```

### Pattern 2: DOI Content Negotiation via Native Fetch

**What:** Use Node.js 18+ native `fetch()` with `Accept: application/x-bibtex` header to get BibTeX directly from doi.org.

**When to use:** REF-02 (DOI fetch) and REF-03 (when DOI is extracted from PDF).

**Example:**
```javascript
// Source: Crossref content negotiation docs
// https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/
async function fetchBibtexFromDoi(doi) {
  const url = `https://doi.org/${encodeURIComponent(doi)}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/x-bibtex',
      'User-Agent': 'get-thesis-done/1.0 (mailto:user@example.com)',
    },
    redirect: 'follow', // default in Node.js 18+, explicit for clarity
  });

  if (!response.ok) {
    throw new Error(`Crossref returned ${response.status} for DOI: ${doi}`);
  }

  return await response.text(); // Raw BibTeX entry
}
```

### Pattern 3: Graduated PDF Metadata Extraction

**What:** Multi-strategy approach for extracting reference data from PDFs, falling back gracefully.

**When to use:** REF-03 (PDF input).

**Strategy order:**
1. `pdfinfo file.pdf` -- check Title, Author, Subject, Keywords fields for DOI
2. `pdftotext -f 1 -l 2 file.pdf -` -- scan first 2 pages for DOI regex
3. If DOI found: delegate to fetch-doi (Crossref fetch -- full BibTeX)
4. If no DOI: construct minimal entry from pdfinfo Title + Author + year guess

**DOI regex (from Crossref recommendation):**
```javascript
// Source: https://www.crossref.org/blog/dois-and-matching-regular-expressions/
const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)\b/;
```

This pattern matches ~99% of DOIs in the Crossref corpus (74.4M / 74.9M).

### Pattern 4: BibTeX Merge with Duplicate Detection

**What:** When importing from a .bib file, detect duplicate entries by citation key and optionally by DOI.

**When to use:** REF-01 (bib file import).

**Logic:**
```
For each entry in source .bib:
  1. Extract citation key
  2. Check if key already exists in references.bib
  3. If duplicate key: skip (report to user)
  4. If unique key: append to references.bib
```

### Pattern 5: Cross-Chapter Citation Validation

**What:** Extend the existing per-chapter `validateCitations()` to work across ALL chapters at once.

**When to use:** REF-04 (reference-manager validation).

**Implementation approach:**
```
1. Read src/references.bib -> extract all valid keys
2. Glob src/chapters/*.tex + .planning/chapters/*/DRAFT*.tex
3. For each .tex file: extract all \cite{} keys using existing citePattern regex
4. Compare each cited key against valid keys
5. Report: per-chapter results + aggregate (all cited keys, all valid keys, orphaned bib entries, missing citations)
```

### Pattern 6: PDF Cross-Reference

**What:** Check which cited references have corresponding PDF files in `src/references/`.

**When to use:** REF-05 (PDF availability report).

**Convention:** PDF files in `src/references/` are matched to citation keys by filename:
- `src/references/silva2023.pdf` matches key `silva2023`
- Case-insensitive matching
- Also check for DOI-based filenames (e.g., `10.1234-example.pdf` normalized)

### Anti-Patterns to Avoid

- **Installing npm packages for BibTeX parsing:** The project constraint is zero runtime npm dependencies. BibTeX entry extraction is regex-friendly; full AST parsing is unnecessary for import/merge.
- **Building a custom PDF parser in JavaScript:** Delegate to system utilities (pdfinfo, pdftotext). These are battle-tested, handle edge cases, and come free with poppler-utils.
- **Silently overwriting existing bib entries:** Always detect duplicates and report. User decides on conflicts.
- **Making Crossref API calls without User-Agent/mailto:** Without polite pool identification, rate limits are 5 req/s single-record (vs 10 req/s polite). Always include User-Agent header.
- **Blocking on PDF metadata extraction failures:** PDF metadata is unreliable. Degrade gracefully -- minimal entry with TODO markers is better than failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BibTeX key extraction | Custom parser | `extractBibKeys()` already in gtd-tools.js | Proven regex, handles all entry types |
| Citation pattern matching | New regex | `validateCitations()` citePattern already in gtd-tools.js | Covers all biblatex variants (cite, textcite, autocite, parencite, footcite, cites, starred) |
| PDF text extraction | JavaScript PDF library | `pdftotext` from poppler-utils | Zero npm deps; system utility handles encoding, layout, font issues |
| PDF metadata extraction | JavaScript PDF library | `pdfinfo` from poppler-utils | Zero npm deps; extracts Info dictionary reliably |
| HTTP requests | http/https module manual | Native `fetch()` in Node.js 18+ | Simpler API, follows redirects by default, handles HTTPS |
| BibTeX format generation | Template engine | String concatenation | BibTeX format is simple key=value in braces; no templating needed |

**Key insight:** The zero-dependency constraint is actually achievable because the two hardest problems (HTTP fetching and PDF processing) are solved by Node.js 18+ native fetch and poppler-utils system utilities respectively.

## Common Pitfalls

### Pitfall 1: Crossref Content Negotiation Returns HTML Instead of BibTeX

**What goes wrong:** The `fetch()` call to `https://doi.org/10.xxx` returns HTML instead of BibTeX.

**Why it happens:** The `Accept` header is not set correctly, or the DOI resolver does not support content negotiation for the requested DOI (non-Crossref DOIs, e.g., DataCite).

**How to avoid:**
- Always set `Accept: application/x-bibtex` explicitly
- Check `response.headers.get('content-type')` to verify BibTeX was returned
- If content-type is `text/html`, fall back to Crossref REST API JSON endpoint: `https://api.crossref.org/works/{doi}`
- Handle non-Crossref DOIs (DataCite uses the same content negotiation protocol)

**Warning signs:** Response body starts with `<!DOCTYPE html>` or `<html>`.

### Pitfall 2: BibTeX Entry Merging Creates Invalid File

**What goes wrong:** Appending entries to references.bib creates a malformed file (entries run together, missing newlines, broken encoding).

**Why it happens:** Simple string append without proper delimiters.

**How to avoid:**
- Always ensure a blank line between entries
- Preserve UTF-8 encoding throughout (critical for Portuguese/Spanish names)
- Read existing file, check if it ends with newline, add separator if needed
- Validate the resulting file by re-extracting keys after write

**Warning signs:** biber/biblatex compilation errors about malformed entries.

### Pitfall 3: pdfinfo/pdftotext Not Installed

**What goes wrong:** The PDF extraction commands fail with "command not found".

**Why it happens:** poppler-utils is not installed on the user's system.

**How to avoid:**
- Check for command availability before using: `which pdfinfo` and `which pdftotext`
- Provide a clear error message with installation instructions per platform
- Make PDF extraction (REF-03) degrade gracefully -- if tools are missing, inform user and skip to manual entry mode
- Document poppler-utils as a system dependency for REF-03 functionality

**Warning signs:** `execSync('pdfinfo ...')` throws with ENOENT.

### Pitfall 4: DOI Regex False Positives in PDF Text

**What goes wrong:** The DOI regex matches a string in the PDF that is not actually the paper's DOI (e.g., a DOI of a cited reference within the paper).

**Why it happens:** Academic papers contain many DOIs in their reference lists. The first-page scan may pick up the wrong one.

**How to avoid:**
- Scan pages 1-2 only (the paper's own DOI is almost always on page 1)
- Prefer DOI found in PDF metadata (pdfinfo) over DOI found in text
- If multiple DOIs found on page 1, prefer the one that appears earliest (usually header/footer DOI)
- Present the found DOI to the user for confirmation before fetching

**Warning signs:** Fetched BibTeX describes a different paper than the PDF.

### Pitfall 5: Citation Key Conflicts on Import

**What goes wrong:** Imported .bib entries use keys that conflict with existing entries in references.bib (same key, different papers).

**Why it happens:** Different reference managers generate keys independently. Two different Zotero libraries might both produce `silva2023` for different papers.

**How to avoid:**
- On key collision: compare DOI fields (if present) to determine if truly duplicate or conflict
- If truly duplicate (same DOI): skip silently
- If conflict (different DOI or no DOI): append suffix (`silva2023a`, `silva2023b`) and report to user
- Never silently overwrite an existing entry

**Warning signs:** After import, `\cite{silva2023}` resolves to the wrong paper.

### Pitfall 6: Cross-Chapter Validation Missing Draft Files

**What goes wrong:** The cross-chapter validation (REF-04) only checks `src/chapters/*.tex` and misses chapters that are still in draft status (`.planning/chapters/*/DRAFT.tex`).

**Why it happens:** Chapters only move to `src/chapters/` after review approval. Work-in-progress chapters live in `.planning/chapters/`.

**How to avoid:**
- Scan BOTH locations: `src/chapters/*.tex` AND `.planning/chapters/*/*.tex` (DRAFT, DRAFT-r1, DRAFT-r2)
- For planning directories, only check the latest draft (highest revision number or canonical DRAFT.tex)
- Report which location each cited key came from

**Warning signs:** Validation reports 0 citations for chapters that clearly have citations in their drafts.

## Code Examples

### Existing BibTeX Key Extraction (from gtd-tools.js)

```javascript
// Source: get-thesis-done/bin/gtd-tools.js line 676-683
function extractBibKeys(bibContent) {
  const keys = new Set();
  const pattern = /@\w+\{([^,\s]+)/g;
  let match;
  while ((match = pattern.exec(bibContent)) !== null) {
    keys.add(match[1].trim());
  }
  return keys;
}
```

### Full BibTeX Entry Extraction (new -- needed for import)

```javascript
// Extract complete BibTeX entries (not just keys) for import/merge
function extractBibEntries(bibContent) {
  const entries = [];
  // Match @type{key, ... } with balanced brace tracking
  const entryStart = /@(\w+)\{([^,\s]+),/g;
  let match;
  while ((match = entryStart.exec(bibContent)) !== null) {
    const type = match[1];
    const key = match[2].trim();
    const startIdx = match.index;

    // Find the matching closing brace
    let depth = 1;
    let i = bibContent.indexOf('{', startIdx) + 1;
    while (i < bibContent.length && depth > 0) {
      if (bibContent[i] === '{') depth++;
      else if (bibContent[i] === '}') depth--;
      i++;
    }

    const entryText = bibContent.slice(startIdx, i);
    entries.push({ type, key, text: entryText });
  }
  return entries;
}
```

### DOI Fetch via Crossref Content Negotiation (new)

```javascript
// Source: Crossref content negotiation docs
// https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/
async function cmdFetchDoi(cwd, doi, raw) {
  // Normalize DOI (strip URL prefix if present)
  const normalizedDoi = doi
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();

  if (!/^10\.\d{4,9}\//.test(normalizedDoi)) {
    error('Invalid DOI format: ' + doi + '\nExpected: 10.XXXX/...');
  }

  const url = `https://doi.org/${encodeURIComponent(normalizedDoi)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'Accept': 'application/x-bibtex',
        'User-Agent': 'get-thesis-done/1.0 (https://github.com/user/get-thesis-done; mailto:user@example.com)',
      },
      redirect: 'follow',
    });
  } catch (err) {
    error('Network error fetching DOI: ' + err.message);
  }

  if (!response.ok) {
    error('Crossref returned HTTP ' + response.status + ' for DOI: ' + normalizedDoi);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('bibtex') && !contentType.includes('text/plain')) {
    error('Unexpected response type: ' + contentType + '. DOI may not support BibTeX content negotiation.');
  }

  const bibtex = await response.text();

  // Append to references.bib
  const bibPath = path.join(cwd, 'src', 'references.bib');
  appendBibEntry(bibPath, bibtex);

  output({
    doi: normalizedDoi,
    bibtex: bibtex.trim(),
    appended_to: 'src/references.bib',
  }, raw, 'Fetched and added:\n' + bibtex.trim());
}
```

### PDF Metadata Extraction Strategy (new)

```javascript
// Source: poppler-utils pdfinfo and pdftotext
function extractDOIFromPdf(pdfPath) {
  const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)\b/;

  // Strategy 1: Check PDF metadata via pdfinfo
  try {
    const info = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf-8', stdio: 'pipe' });
    // Check Subject, Keywords, and custom fields for DOI
    for (const line of info.split('\n')) {
      const match = line.match(DOI_REGEX);
      if (match) return { doi: match[1], source: 'metadata' };
    }
  } catch { /* pdfinfo not available or failed */ }

  // Strategy 2: Scan first 2 pages of text for DOI
  try {
    const text = execSync(`pdftotext -f 1 -l 2 "${pdfPath}" -`, { encoding: 'utf-8', stdio: 'pipe' });
    const match = text.match(DOI_REGEX);
    if (match) return { doi: match[1], source: 'text' };
  } catch { /* pdftotext not available or failed */ }

  return null; // No DOI found
}
```

### Cross-Chapter Validation (new -- extending existing pattern)

```javascript
// Extend validate-citations for all chapters (REF-04)
function cmdValidateRefs(cwd, raw) {
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const bibContent = safeReadFile(bibPath);
  if (!bibContent) error('references.bib not found at src/references.bib');
  const validKeys = extractBibKeys(bibContent);

  const results = [];

  // Scan src/chapters/*.tex (approved chapters)
  const srcChaptersDir = path.join(cwd, 'src', 'chapters');
  // Scan .planning/chapters/*/DRAFT*.tex (work in progress)
  const planningChaptersDir = path.join(cwd, '.planning', 'chapters');

  // ... glob and validate each file using existing citePattern ...

  // Aggregate: all cited keys, missing keys, orphaned bib entries
  const allCited = new Set(/* union of all cited keys */);
  const missingKeys = [...allCited].filter(k => !validKeys.has(k));
  const orphanedKeys = [...validKeys].filter(k => !allCited.has(k));

  output({
    total_bib_entries: validKeys.size,
    total_cited_keys: allCited.size,
    missing_from_bib: missingKeys,
    orphaned_in_bib: orphanedKeys,
    per_chapter: results,
  }, raw, /* formatted summary */);
}
```

### PDF Cross-Reference Check (new -- REF-05)

```javascript
// Check which cited keys have corresponding PDFs (REF-05)
function cmdPdfRefs(cwd, raw) {
  const refsDir = path.join(cwd, 'src', 'references');
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const bibContent = safeReadFile(bibPath);
  if (!bibContent) error('references.bib not found');
  const validKeys = extractBibKeys(bibContent);

  // List PDFs in references/ directory
  let pdfFiles = [];
  if (fs.existsSync(refsDir)) {
    pdfFiles = fs.readdirSync(refsDir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => f.replace(/\.pdf$/i, '').toLowerCase());
  }

  const withPdf = [];
  const withoutPdf = [];
  for (const key of validKeys) {
    if (pdfFiles.includes(key.toLowerCase())) {
      withPdf.push(key);
    } else {
      withoutPdf.push(key);
    }
  }

  output({
    total_entries: validKeys.size,
    with_pdf: withPdf.length,
    without_pdf: withoutPdf.length,
    with_pdf_keys: withPdf,
    without_pdf_keys: withoutPdf,
  }, raw, /* formatted report */);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Crossref rate limits unchanged since 2013 | New rate limits (Dec 2025): polite pool 10 req/s single, 3 req/s list | Dec 2025 | Must include User-Agent/mailto for polite pool |
| Node.js http/https module for HTTP | Native fetch() in Node.js 18+ | 2022 | Zero-dep HTTP possible |
| npm libraries for PDF parsing | System utilities (poppler-utils) | Always available | Zero npm deps for PDF |
| Manual BibTeX assembly from JSON | Content negotiation returns BibTeX directly | Crossref supports this | No JSON-to-BibTeX conversion needed |

**Crossref rate limits (effective Dec 2025):**
- Public pool: 5 req/s single record, 1 req/s list queries
- Polite pool (with mailto): 10 req/s single record, 3 req/s list queries
- The polite pool is accessed by including `mailto` in User-Agent header or query parameter

## CLI Command Design

### New Commands for gtd-tools.js

| Command | Purpose | Req |
|---------|---------|-----|
| `import-bib --file path.bib` | Import entries from .bib file into references.bib | REF-01 |
| `fetch-doi --doi 10.xxxx/...` | Fetch BibTeX from Crossref and append | REF-02 |
| `pdf-meta --file path.pdf` | Extract metadata from PDF, attempt DOI fetch | REF-03 |
| `validate-refs` | Cross-chapter citation validation (all chapters) | REF-04 |
| `pdf-refs` | Cross-reference cited keys with PDFs in references/ | REF-05 |

### Command Design Principles (matching existing patterns)

- All commands follow the existing CLI router pattern (switch/case in `main()`)
- All commands support `--raw` flag for machine-readable output
- JSON output for structured data, raw text for human-readable
- Error handling via `error()` function (stderr + exit 1)
- File paths relative to `cwd` (same as existing commands)
- `fetch-doi` is async -- use top-level await pattern or `.then()` in main()

### Async Consideration

The existing gtd-tools.js is synchronous. `fetch-doi` and `pdf-meta` (when delegating to fetch-doi) require async execution. The recommended approach:

```javascript
// In main(), detect async commands and handle accordingly
case 'fetch-doi': {
  const doiIdx = args.indexOf('--doi');
  const doi = doiIdx !== -1 ? args[doiIdx + 1] : null;
  cmdFetchDoi(cwd, doi, raw).catch(err => {
    error(err.message);
  });
  break;
}
```

Or make `main()` async (Node.js 18+ supports top-level await in CommonJS via `.then()`):

```javascript
async function main() {
  // ... existing sync commands unchanged ...
  // ... async commands use await ...
}

main().catch(err => {
  process.stderr.write('Error: ' + err.message + '\n');
  process.exit(1);
});
```

## Reference-Manager Agent Design

### Role

The reference-manager agent is spawned by the add-reference workflow for:
1. Reviewing imported/fetched BibTeX entries for completeness
2. Suggesting citation key improvements (standardize to `lastname_year` pattern)
3. Running cross-chapter validation and PDF cross-reference checks
4. Presenting results to the user with actionable recommendations

### Key Differences from Other Agents

Unlike the reviewer/writer/planner agents which are spawned with chapter context, the reference-manager operates at the **thesis level** -- it sees all chapters and the entire references.bib.

### Agent Design Pattern

```markdown
---
name: reference-manager
description: Manages reference imports, validates citations across chapters, and cross-references PDFs. Spawned by add-reference workflow.
tools: Read, Write, Bash, Glob, Grep
color: blue
---

<role>
You are a reference manager for the thesis writing pipeline.
You validate bibliography entries, ensure citation completeness,
and help maintain a clean references.bib.
</role>
```

The agent should NOT:
- Modify chapter .tex files (that is the writer's job)
- Fetch references itself (the CLI does that)
- Make style decisions about citation format (that is the reviewer's job)

The agent SHOULD:
- Report validation results clearly
- Suggest missing references based on uncited keys
- Flag entries with missing required fields
- Recommend citation key standardization

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual verification via CLI + file checks |
| Config file | none -- verification embedded in plan execution |
| Quick run command | `node get-thesis-done/bin/gtd-tools.js validate-refs --raw 2>/dev/null; echo $?` |
| Full suite command | Manual verification checklist per plan |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REF-01 | Import entries from .bib file | smoke | `echo '@article{test2024, author={Test}, title={Test}, year={2024}}' > /tmp/test.bib && node gtd-tools.js import-bib --file /tmp/test.bib` | Wave 0 |
| REF-02 | Fetch BibTeX from DOI | integration | `node gtd-tools.js fetch-doi --doi 10.1038/nature12373 --raw` | Wave 0 |
| REF-03 | Extract metadata from PDF | integration | `node gtd-tools.js pdf-meta --file test.pdf --raw` | Wave 0 |
| REF-04 | Cross-chapter citation validation | unit | `node gtd-tools.js validate-refs --raw` | Wave 0 |
| REF-05 | PDF cross-reference report | unit | `node gtd-tools.js pdf-refs --raw` | Wave 0 |

### Sampling Rate

- **Per task commit:** CLI command smoke tests
- **Per wave merge:** Full validation checklist
- **Phase gate:** All 5 REF-* requirements verified with manual test

### Wave 0 Gaps

- [ ] `gtd-tools.js import-bib` -- new command
- [ ] `gtd-tools.js fetch-doi` -- new command (async)
- [ ] `gtd-tools.js pdf-meta` -- new command (async + system dep)
- [ ] `gtd-tools.js validate-refs` -- new command (extends validateCitations)
- [ ] `gtd-tools.js pdf-refs` -- new command
- [ ] `agents/reference-manager.md` -- does not exist yet
- [ ] `get-thesis-done/workflows/add-reference.md` -- does not exist yet
- [ ] `commands/gtd/add-reference.md` -- does not exist yet

## Open Questions

1. **Should fetch-doi support batch mode (multiple DOIs at once)?**
   - What we know: Rate limits allow 10 req/s (polite pool). Users often have lists of DOIs.
   - What's unclear: Whether batch is v1 scope or can be deferred.
   - Recommendation: Support single DOI in v1. Batch can be handled by calling the command multiple times in the workflow. The workflow can present a list interface.

2. **How should citation key collisions be resolved during import?**
   - What we know: Zotero/Mendeley may generate conflicting keys. Same key, different papers.
   - What's unclear: Whether to auto-suffix or prompt user.
   - Recommendation: Auto-suffix with `a`, `b`, `c` and report to user. The add-reference workflow presents the result and lets the user rename if desired.

3. **Should poppler-utils be a hard requirement for REF-03?**
   - What we know: The zero-npm-dep constraint does not cover system utilities. poppler-utils is widely available on academic Linux setups.
   - What's unclear: What happens on systems without poppler-utils.
   - Recommendation: Soft requirement. If pdfinfo/pdftotext are not found, skip PDF metadata extraction and ask the user to provide DOI or manual entry. Report a clear message with installation instructions.

4. **Should the cross-chapter validation (REF-04) scan .planning/chapters/ or only src/chapters/?**
   - What we know: Only reviewed/approved chapters are in src/chapters/. Work-in-progress drafts are in .planning/chapters/.
   - What's unclear: Whether users want validation of work-in-progress.
   - Recommendation: Scan both locations. Use `src/chapters/*.tex` as primary (approved) and `.planning/chapters/*/*.tex` as secondary (draft). Report which source each citation came from.

5. **Should the reference-manager agent be spawned for every add-reference or only for validation?**
   - What we know: Import and DOI fetch are mechanical operations (CLI handles them). Validation requires judgment.
   - What's unclear: Whether agent spawn overhead is justified for simple import.
   - Recommendation: The workflow handles import/fetch via CLI directly (no agent needed for mechanical operations). The agent is spawned only for validation runs and complex PDF cases where judgment is needed. This keeps simple operations fast.

## Sources

### Primary (HIGH confidence)

- `get-thesis-done/bin/gtd-tools.js` -- Current CLI with extractBibKeys(), validateCitations(), and CLI router pattern
- `get-thesis-done/templates/references.bib` -- BibTeX template showing expected format (biblatex/biber backend, UTF-8)
- [Crossref Content Negotiation](https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/) -- Official docs for `Accept: application/x-bibtex` header
- [Crossref Rate Limits (Dec 2025)](https://www.crossref.org/blog/announcing-changes-to-rest-api-rate-limits/) -- Polite pool: 10 req/s single, 3 req/s list; Public: 5 req/s single, 1 req/s list
- [Crossref DOI Regex](https://www.crossref.org/blog/dois-and-matching-regular-expressions/) -- Recommended pattern: `/^10.\d{4,9}/[-._;()/:A-Z0-9]+$/i` (99%+ coverage)
- [poppler-utils pdfinfo manpage](https://manpages.debian.org/testing/poppler-utils/pdfinfo.1.en.html) -- Extracts Title, Author, Subject, Keywords from PDF Info dictionary
- [poppler-utils pdftotext manpage](https://manpages.debian.org/testing/poppler-utils/pdftotext.1.en.html) -- `-f 1 -l 2` for first 2 pages, `-` for stdout

### Secondary (MEDIUM confidence)

- [Crossref REST API Access](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/) -- mailto parameter for polite pool access
- [BibTeX Entry Types](https://www.bibtex.com/e/entry-types/) -- Required fields per entry type
- Node.js 18+ native fetch follows redirects by default (redirect: 'follow') -- confirmed via undici documentation

### Tertiary (LOW confidence)

- PDF DOI location patterns (DOI usually on first page header/footer for Crossref-registered papers) -- empirical observation, not formally documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Node.js 18+ native fetch verified for Crossref content negotiation; poppler-utils verified for PDF extraction
- Architecture: HIGH -- CLI extension patterns well-established in codebase; multi-mode input detection is straightforward
- Pitfalls: HIGH -- Crossref API behavior, PDF metadata inconsistency, and BibTeX merge issues are well-documented in Crossref community forums
- REF-03 (PDF extraction): MEDIUM -- Multi-strategy approach is sound but PDF metadata quality varies wildly across publishers

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (Crossref API is stable; poppler-utils is stable; Node.js 18+ fetch is stable)
