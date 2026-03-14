---
name: gtd:add-reference
description: Import, fetch, or extract a reference and add it to the thesis bibliography
argument-hint: "<source: .bib file path | DOI (10.xxxx/...) | PDF file path>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---
<objective>
Add a reference to the thesis bibliography from any supported source. Auto-detects input type and delegates to the appropriate import method. Runs cross-chapter citation validation after import.

Context budget: ~20% orchestrator, CLI handles heavy lifting.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/add-reference.md
</execution_context>

<context>
Source: $ARGUMENTS
</context>

<process>
1. Execute the add-reference workflow from
   @~/.claude/get-thesis-done/workflows/add-reference.md end-to-end.
   Pass `$ARGUMENTS` as the source input.

2. The workflow will:
   - Auto-detect the input mode (.bib file / DOI / doi.org URL / PDF file)
   - Run the appropriate CLI command (import-bib / fetch-doi / pdf-meta)
   - Validate citations across all chapters (validate-refs)
   - Check PDF availability (pdf-refs)
   - Commit changes to references.bib

3. On completion, report all results:
   - Entries added (count and citation keys)
   - Validation status (all clear or missing citations per chapter)
   - PDF availability (N/M references have local PDFs)
   - Next recommended action (if validation found issues)
</process>
