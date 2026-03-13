---
name: gtd:plan-chapter
description: Create a chapter beat sheet (PLAN.md) with sections, arguments, and planned citations
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - Glob
  - Grep
---
<objective>
Create a structured beat sheet for chapter N by spawning the planner agent with canonical context.
Presents the plan for author approval before finalizing.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/plan-chapter.md
</execution_context>

<process>
Receive the chapter number from the user (e.g., `/gtd:plan-chapter 3`).
Check for optional `--research` flag.
Execute the plan-chapter workflow from @~/.claude/get-thesis-done/workflows/plan-chapter.md end-to-end.
</process>
