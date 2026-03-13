---
name: gtd:review-chapter
description: Review a chapter and automatically update canonical documents on approval
argument-hint: "<chapter-number>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Run the academic review pipeline for a thesis chapter, then on author approval, automatically
chain to the continuity loop to update FRAMEWORK.md and fill SUMMARY.md.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@~/.claude/get-thesis-done/workflows/review-chapter.md
@~/.claude/get-thesis-done/workflows/continuity-loop.md
</execution_context>

<context>
Chapter: $ARGUMENTS
</context>

<process>
1. Execute the review-chapter workflow from
   @~/.claude/get-thesis-done/workflows/review-chapter.md end-to-end.
   Preserve all workflow gates (validation, 4 review categories, revision cycles, checkpoints).

2. After review finalization, check the review status:
   - If the review status is "approved" (author approved at the review checkpoint),
     display the message: "Review passed. Running continuity update (FRAMEWORK.md + SUMMARY.md)..."
     Then automatically execute the continuity-loop workflow from
     @~/.claude/get-thesis-done/workflows/continuity-loop.md for the same chapter.
   - If the review status is NOT approved (still has findings, author chose "rewrite",
     or revision cycles are ongoing), do NOT chain to the continuity loop.
     Report the review status and let the author decide next steps.

3. On combined completion, report all files produced by both workflows:
   - REVIEW.md from the review workflow
   - Updated FRAMEWORK.md from the continuity loop (if chained)
   - SUMMARY.md from the continuity loop (if chained)
</process>
