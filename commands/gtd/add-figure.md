---
name: gtd:add-figure
description: Create and register a figure in the thesis figure catalog with source file scaffolding
argument-hint: "<figure-id> [--type <excalidraw|tikz|static>] [--chapter <N>] [--caption <text>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---
<objective>
Register a new figure in the thesis FIGURES.md catalog, create the appropriate source file scaffold, and generate the LaTeX inclusion snippet. Auto-gathers any missing details interactively.

Context budget: ~25% orchestrator -- CLI handles registration and validation, workflow handles source file creation and snippet generation.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/add-figure.md
</execution_context>

<context>
Arguments: $ARGUMENTS
</context>

<process>
1. Execute the add-figure workflow from
   @~/.claude/get-thesis-done/workflows/add-figure.md end-to-end.
   Pass `$ARGUMENTS` as the input.

2. The workflow will:
   - Parse or interactively gather figure details (ID, type, chapter, caption)
   - Register the figure in FIGURES.md via CLI (register-figure command)
   - Create the source file scaffold (excalidraw JSON, tikz template, or static placement instructions)
   - Generate the LaTeX inclusion snippet with correct abnTeX2 ordering
   - Run figure validation (validate-figs)
   - Commit changes to git

3. On completion, report all results:
   - Registered figure details (ID, type, chapter, source file path)
   - LaTeX snippet for chapter inclusion
   - Validation status (all figure references healthy or issues found)
   - Next steps (edit source file, insert snippet, compile)
</process>
