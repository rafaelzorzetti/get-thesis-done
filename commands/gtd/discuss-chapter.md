---
name: gtd:discuss-chapter
description: Discuss a chapter before planning to capture locked decisions in CONTEXT.md
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---
<objective>
Discuss chapter N with the author to capture intent, tone, evidence choices, and methodological
approach before planning. Produce a CONTEXT.md with locked decisions that the planner respects.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/discuss-chapter.md
</execution_context>

<process>
Receive the chapter number from the user (e.g., `/gtd:discuss-chapter 3`).
Execute the discuss-chapter workflow from @~/.claude/get-thesis-done/workflows/discuss-chapter.md end-to-end.
</process>
