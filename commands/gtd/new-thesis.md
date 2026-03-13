---
name: gtd:new-thesis
description: Initialize a new thesis project through guided questioning and template population
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
Initialize a new thesis project through unified flow: guided questioning about the thesis (research topic, level, advisor, norms, language, methodology, structure), scaffold dual-track directories via CLI, then populate canonical documents and LaTeX files with the author's answers. Creates FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md, FIGURES.md, main.tex, chapter stubs, and thesis.json -- all populated with thesis-specific content.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/new-thesis.md
@~/.claude/get-thesis-done/templates/framework.md
@~/.claude/get-thesis-done/templates/style-guide.md
@~/.claude/get-thesis-done/templates/structure.md
@~/.claude/get-thesis-done/templates/figures.md
@~/.claude/get-thesis-done/templates/main.tex
@~/.claude/get-thesis-done/templates/chapter.tex
@~/.claude/get-thesis-done/templates/references.bib
</execution_context>

<process>
Execute the new-thesis workflow from @~/.claude/get-thesis-done/workflows/new-thesis.md end-to-end. Preserve all workflow gates (validation, questioning, scaffolding, population, compilation verification, commit).
</process>
