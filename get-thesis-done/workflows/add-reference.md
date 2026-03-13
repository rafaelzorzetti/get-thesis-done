<purpose>
Orchestrate reference addition from multiple sources (.bib file, DOI, PDF) into the thesis bibliography. Auto-detect input mode from the argument, delegate to the appropriate CLI command, then run cross-chapter citation validation and PDF cross-reference checks. Present all results to the user with actionable recommendations.
</purpose>

<core_principle>
CLI commands do the mechanical work (import, fetch, extract, validate). This workflow orchestrates the sequence and presents results. For simple imports (bib file, DOI), no agent is needed -- the CLI output is sufficient. For complex cases (PDF with no DOI, validation failures), the reference-manager agent is spawned for judgment calls.
</core_principle>

<terminology>

## Thesis-Native Terminology

This workflow uses thesis-native terminology throughout. The mapping:

| This Workflow Says | NOT This |
|--------------------|----------|
| reference | source |
| bibliography | database |
| citation key | identifier |
| references.bib | bibliography file |
| thesis | book |
| chapter | phase |
| FRAMEWORK.md | BIBLE.md |
| STRUCTURE.md | OUTLINE.md |
| gtd-tools.js | gwd-tools.js |
| get-thesis-done | get-writing-done |
| /gtd:* | /gwd:* |

All communication with the researcher uses the left column. The right column terms never appear in researcher-facing messages.

</terminology>

<process>

<step name="detect_input" priority="first">

## Step 1: Receive and Detect Input Mode

Receive argument from user via `/gtd:add-reference <source>`.

**Auto-detect mode using these rules (test in order):**

1. If argument ends with `.bib` (case-insensitive) --> MODE: `import-bib`
2. If argument matches `/^10\.\d{4,9}\//` --> MODE: `fetch-doi`
3. If argument contains `doi.org/` --> MODE: `fetch-doi` (extract DOI from URL: strip `https://doi.org/` prefix)
4. If argument ends with `.pdf` (case-insensitive) --> MODE: `pdf-meta`
5. Otherwise --> Ask user: "Could not auto-detect input type for '{source}'. Please specify: Is this a DOI, a .bib file path, or a PDF file path?"

**Validate file existence** (for .bib and .pdf modes):

```bash
test -f "{source}" && echo "File found: {source}" || echo "ERROR: File not found: {source}"
```

If the file does not exist, report the error and stop:

```
File not found: {source}
Please check the path and try again.
```

**Report detected mode:**

```
Detected mode: {mode} for input: {source}
```

</step>

<step name="execute_command">

## Step 2: Execute Import/Fetch/Extract

Based on detected mode, run the corresponding CLI command.

### For import-bib mode:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js import-bib --file "{source}" --raw
```

Parse output. Report imported count and skipped duplicates to user.

If any entries were skipped due to key collision, list the skipped keys and ask if user wants to review them:

```
Imported {N} entries into references.bib.
Skipped {M} duplicate entries (keys already exist): {skipped_keys}

Would you like to review the skipped entries to check if they differ from existing ones?
```

If all entries are new (no skips), simply confirm:

```
Imported {N} entries into references.bib: {imported_keys}
```

### For fetch-doi mode:

If the input contained `doi.org/`, extract the DOI by stripping the URL prefix:

```
DOI extracted from URL: {doi}
```

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js fetch-doi --doi "{doi}" --raw
```

Parse output. Show the fetched BibTeX entry to user:

```
Fetched and added to references.bib:

{bibtex_entry}
```

If fetch fails (network error, invalid DOI, content negotiation failure), report the error clearly and suggest alternatives:

```
Failed to fetch BibTeX for DOI: {doi}
Error: {error_message}

Suggestions:
1. Check DOI format (should be like 10.1234/abc.2023)
2. Try accessing https://doi.org/{doi} in your browser to verify the DOI is valid
3. If the DOI is correct but Crossref is unavailable, download the .bib entry manually and use:
   /gtd:add-reference path/to/downloaded.bib
```

### For pdf-meta mode:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js pdf-meta --file "{source}" --raw
```

Parse output. If DOI was found and BibTeX was fetched from Crossref, show the entry:

```
Found DOI in PDF: {doi}
Fetched and added to references.bib:

{bibtex_entry}
```

If a minimal entry was created (no DOI found in PDF), show the entry with a clear warning:

```
No DOI found in PDF. Created minimal entry from PDF metadata:

{bibtex_entry}

WARNING: This is a minimal entry extracted from PDF metadata.
Please review and complete the following fields:
  - journal / booktitle
  - volume
  - pages
  - doi
```

If poppler-utils is not installed (pdfinfo/pdftotext unavailable), report the error with installation instructions:

```
PDF metadata extraction requires poppler-utils, which is not installed.

To install:
  Ubuntu/Debian: sudo apt-get install poppler-utils
  macOS: brew install poppler
  Fedora: sudo dnf install poppler-utils

Alternatively, if you know the DOI, provide it directly:
  /gtd:add-reference 10.1234/your-doi-here
```

</step>

<step name="validate">

## Step 3: Post-Import Validation

After any successful import/fetch/extract, automatically run validation.

### Cross-chapter citation validation:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js validate-refs --raw
```

Present results to user:

- If 0 missing citations: "All citations across all chapters resolve to references.bib entries."
- If missing citations exist, list them per chapter:

```
Citation validation found {N} missing references:

Chapter {chapter}: {missing_keys}

These citation keys appear in chapter .tex files but have no matching entry in references.bib.
Consider adding them with /gtd:add-reference.
```

- If orphaned entries exist (in .bib but never cited), note them informally:

```
Note: {N} entries in references.bib are not cited in any chapter yet: {orphaned_keys}
(This is informational -- they may be intended for future chapters.)
```

### PDF cross-reference check:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js pdf-refs --raw
```

Present PDF availability:

```
PDF availability: {N} of {M} referenced works have corresponding PDFs in src/references/
```

If entries are missing PDFs, list them as informational (not a blocker):

```
References without local PDF copies:
  - {key1}
  - {key2}

(Having local PDFs is recommended but not required for compilation.)
```

</step>

<step name="commit">

## Step 4: Commit Changes

If references.bib was modified during import/fetch/extract:

```bash
git add src/references.bib
git commit -m "refs: add reference(s) via /gtd:add-reference"
```

Report the commit to user:

```
Committed updated references.bib to git.
```

If references.bib was not modified (e.g., all entries were duplicates), skip the commit:

```
No changes to references.bib (all entries were duplicates). Nothing to commit.
```

</step>

<step name="summary">

## Step 5: Summary

Present a final summary of the operation:

```
## Reference Addition Summary

**Mode:** {import-bib / fetch-doi / pdf-meta}
**Input:** {source}
**Entries added:** {count} ({keys})
**Validation:** {All clear / N missing citations across chapters}
**PDF availability:** {N}/{M} references have local PDFs

{Next recommended action, if any}
```

**Next action recommendations:**

- If validation found missing citations: "Run `/gtd:add-reference` for each missing citation to resolve them."
- If a minimal entry was created: "Review the minimal entry in references.bib and complete the missing fields (journal, volume, pages, doi)."
- If all is clear: "Bibliography is up to date. All citations resolve and no action is needed."

</step>

</process>

<constraints>

## Workflow Constraints

- The workflow does NOT spawn the reference-manager agent for simple operations. Agent spawn is reserved for when the user explicitly asks for a full validation review (future enhancement).
- The workflow handles one reference source at a time. For batch DOI import, the user runs `/gtd:add-reference` multiple times (the workflow is fast enough for sequential use).
- All error messages use thesis-native terminology.
- The workflow never modifies chapter .tex files -- it only updates references.bib and reports validation results.
- The workflow does not modify citation format in .tex files. That is the reviewer agent's job (Category 1: Citation Validity).

</constraints>

<error_handling>

## Error Recovery

**File not found (.bib or .pdf):**
- Report the exact path that was not found
- Suggest checking the path (typo, relative vs absolute)

**Network error (DOI fetch):**
- Report the error from the CLI command
- Suggest checking internet connectivity
- Offer the manual .bib import alternative

**Invalid DOI format:**
- Report what was received and why it does not match expected format
- Show the expected format: `10.NNNN/...`

**poppler-utils not installed (PDF mode):**
- Report the missing dependency with installation commands per platform
- Suggest using DOI mode as a workaround

**Empty .bib file:**
- Report that no entries were found in the provided file
- Suggest checking the file format

**Permission error (cannot write to references.bib):**
- Report the permission error
- Suggest checking file/directory permissions

</error_handling>

<context_efficiency>

## Context Budget

This workflow is lightweight (~20% context):

1. **CLI does the heavy lifting.** The workflow runs CLI commands and parses their output. No file content analysis happens in the workflow itself.
2. **No agent spawn for simple operations.** import-bib, fetch-doi, and pdf-meta are fully handled by CLI commands. The reference-manager agent is only for full validation reviews.
3. **Sequential steps, no accumulation.** Each step runs its CLI command and presents results. No cross-step state beyond the detected mode and source path.

</context_efficiency>
