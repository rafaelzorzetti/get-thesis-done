---
name: gtd:write-chapter
description: Plan and write a thesis chapter through the two-wave LaTeX writing pipeline
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - Glob
  - Grep
---
<objective>
Orchestrate the full chapter writing pipeline: spawn planner for beat sheet, present plan
for approval, spawn writer for Wave 1 (structural draft in LaTeX), spawn writer for Wave 2
(polished prose in LaTeX), validate citations against references.bib, present draft for
approval, and finalize by copying DRAFT.tex to src/chapters/ for compilation.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/write-chapter.md
</execution_context>

<process>
Receive the chapter number from the user (e.g., `/gtd:write-chapter 3`).
Execute the write-chapter workflow from @~/.claude/get-thesis-done/workflows/write-chapter.md end-to-end.
Preserve all workflow gates (plan approval and draft approval checkpoints).
</process>
