---
name: gtd:progress
description: Show thesis progress dashboard with visual progress bar and next action
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---
<objective>
Show an enhanced thesis progress dashboard with thesis metadata, visual progress bar,
chapter-by-status table with coverage column, current position, and next recommended action.
</objective>

<process>
1. Run `node ~/.claude/get-thesis-done/bin/gtd-tools.js progress` to get chapter data
   (JSON output with chapters, statuses, and completion percentage).

2. Read `.planning/FRAMEWORK.md` frontmatter for the thesis title. Extract the
   `thesis_title:` field from YAML frontmatter.

3. Read `.planning/thesis.json` for thesis level, language, and academic norm.

4. Build the enhanced dashboard:

   **Header:** Display thesis title, level (Graduation/Master's/PhD), language (PT-BR/EN/ES),
   and academic norm (ABNT/APA/IEEE).

   **Progress bar:** Create a visual bar using filled and empty characters proportional
   to the completion percentage. Format: `[========--] X/Y chapters (ZZ%)`

   **Chapter table:** Display columns:
   - Ch: chapter number
   - Title: chapter title from STRUCTURE.md or directory name
   - Status: current status (scaffolded, planned, drafted, reviewed, final)
   - Coverage: indicates if the chapter has SUMMARY.md and FRAMEWORK.md changelog entry
     (use checkmarks or indicators like "full", "summary only", "pending", "--")

   **Current position:** Identify the first incomplete chapter and display its status.

   **Next action recommendation:** Based on the first incomplete chapter's status,
   suggest the appropriate `/gtd:*` command:
   - No directory/scaffolded: `/gtd:plan-chapter N` or `/gtd:write-chapter N`
   - Planned: `/gtd:write-chapter N`
   - Drafted: `/gtd:review-chapter N`
   - Reviewed: Continuity already handled by review-chapter
   - All final: "Thesis complete! Run /gtd:compile for final PDF."

5. Display the dashboard directly to the user. No workflow file needed -- this command
   handles all the formatting inline.
</process>
