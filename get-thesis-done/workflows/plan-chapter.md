<purpose>
Create a chapter beat-sheet PLAN.md from canonical context. This workflow loads context, optionally spawns a researcher, spawns the chapter planner, and presents the plan for author approval. It does NOT proceed to writing.

This is a focused plan-only workflow -- not a subset of write-chapter.md. It handles the planning lifecycle independently and stops after the approved plan is committed.
</purpose>

<core_principle>
Orchestrator coordinates, agents create. This workflow never writes the beat sheet itself -- it validates prerequisites, spawns the planner agent (and optionally a researcher), handles the approval checkpoint, and commits the result. The planner agent does all the heavy lifting with a fresh 200K context window.
</core_principle>

<process>

<step name="initialize" priority="first">

## Step 1: Initialize

Receive chapter number from user (e.g., `/gtd:plan-chapter 3` or `/gtd:plan-chapter 3 --research`).

**Parse arguments:**
- Extract chapter number (required)
- Check for `--research` flag (optional)

**Validate prerequisites:**

```bash
CONTEXT_META=$(node ~/.claude/get-thesis-done/bin/gtd-tools.js context --chapter $CHAPTER_NUMBER)
```

Parse the JSON output. Verify:
- `has_framework` is true -- if false, error: "No FRAMEWORK.md found. Create canonical documents with /gtd:new-thesis first."
- `has_style` is true -- if false, error: "No STYLE_GUIDE.md found. Create canonical documents with /gtd:new-thesis first."
- `has_structure` is true -- if false, error: "No STRUCTURE.md found. Create canonical documents with /gtd:new-thesis first."

**Check for existing PLAN.md:**

```bash
ls .planning/chapters/${PADDED_CHAPTER}-*/${PADDED_CHAPTER}-01-PLAN.md 2>/dev/null
```

If PLAN.md already exists:
```
Chapter $CHAPTER_NUMBER already has a PLAN.md.
Type "overwrite" to replace it or "view" to see the existing plan.
```

- **overwrite:** Continue with planning (existing PLAN.md will be replaced)
- **view:** Display existing PLAN.md content, then offer overwrite or keep

**Create chapter directory:**

```bash
# Derive slug from STRUCTURE.md chapter title (lowercase, hyphenated, ASCII-safe)
mkdir -p .planning/chapters/${PADDED_CHAPTER}-${SLUG}
```

Where `PADDED_CHAPTER` is the zero-padded chapter number (e.g., `03`) and `SLUG` is derived from the chapter title in STRUCTURE.md.

</step>

<step name="optional_research">

## Step 2: Optional Research

Check if `--research` flag is present in the arguments.

**If `--research` is present:**

Read the chapter entry from STRUCTURE.md to extract the thesis and key points. Spawn a general-purpose researcher agent via Task():

```
Task(
  subagent_type="general-purpose",
  prompt="
    You are a research assistant for a thesis chapter. Investigate the following topic
    and provide useful background material.

    <chapter>$CHAPTER_NUMBER</chapter>
    <thesis>$CHAPTER_THESIS</thesis>
    <key_points>$KEY_POINTS</key_points>

    Research:
    - External sources, references, and historical context relevant to the thesis
    - Key thinkers, works, or events related to the key points
    - Counterarguments or alternative perspectives worth addressing
    - Concrete examples, statistics, or case studies that could support the arguments
    - Methodological approaches used in similar research

    Write your findings to: $CHAPTER_DIR/${PADDED_CHAPTER}-01-RESEARCH.md

    Format the research as organized sections matching the key points, with source
    attributions where applicable.
  ",
  description="Research Chapter $CHAPTER_NUMBER"
)
```

After completion, verify the research file was created:

```bash
[ -f "$CHAPTER_DIR/${PADDED_CHAPTER}-01-RESEARCH.md" ] && echo "Research created" || echo "WARNING: Research file not created"
```

If the researcher failed, warn but continue to planning (research is supplementary, not blocking).

**If no `--research` flag:** Skip this step entirely.

</step>

<step name="spawn_planner">

## Step 3: Spawn Planner

Spawn the `planner` agent via Task():

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/planner.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <output_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md</output_path>
  ",
  description="Plan Chapter $CHAPTER_NUMBER"
)
```

If research was performed in Step 2, pass the research path to the planner:

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/planner.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <output_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md</output_path>
    <research_path>$CHAPTER_DIR/${PADDED_CHAPTER}-01-RESEARCH.md</research_path>
  ",
  description="Plan Chapter $CHAPTER_NUMBER"
)
```

The planner agent reads canonical context itself via `gtd-tools.js context` (context isolation principle -- each agent starts with a fresh window).

**After completion:** Verify PLAN.md was created:

```bash
[ -f "$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md" ] && echo "PLAN created" || echo "ERROR: PLAN.md not created"
```

If the planner agent failed, report the error and offer to retry:

```
The chapter planner did not produce a PLAN.md.
Type "retry" to spawn the planner again, or describe what went wrong.
```

</step>

<step name="plan_approval">

## Step 4: Plan Approval Checkpoint

Read the created PLAN.md and present it to the author for approval.

```bash
cat "$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md"
```

Present the plan in a readable format:

```
## Chapter $CHAPTER_NUMBER Plan Ready for Review

**Title:** [from PLAN.md frontmatter]
**Thesis:** [from Chapter Thesis section]
**Sections:** [count from frontmatter]
**Target length:** [from frontmatter] words

### Beat Sheet Summary

[For each section, display:]
**Section N: [Title]**
- Purpose: [section purpose]
- Key arguments: [2-3 arguments listed]
- Terms: [canonical terms from FRAMEWORK.md]
- Planned citations: [.bib keys this section will reference]
- Methodology: [analytical approach for this section]

### Methodological Arc Position
[How this chapter's methodology connects to the overall thesis methodology]

### Threads Being Advanced
[From the beat sheet Threads fields]

### Topics NOT Discussed (Constraints)
[From the Do NOT Touch section]

---
Type "approved" to finalize, or provide feedback to revise the plan.
```

**If the author provides feedback:**

Spawn the planner agent again with the feedback appended:

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/planner.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <output_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md</output_path>

    <revision>
    The author reviewed the previous plan and provided this feedback:
    $AUTHOR_FEEDBACK

    Revise the plan to address this feedback. Read the existing PLAN.md at
    $CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md before revising.
    </revision>
  ",
  description="Revise Chapter $CHAPTER_NUMBER Plan"
)
```

After revision, present the updated plan again for approval. Repeat until the author types "approved".

**If the author types "approved":** Proceed to finalization.

</step>

<step name="finalize">

## Step 5: Finalize

The plan is approved. Commit and report.

**Commit the PLAN.md:**

```bash
git add $CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md
git commit -m "docs(chapter-${CHAPTER_NUMBER}): create chapter beat sheet"
```

If research was performed, include it in the commit:

```bash
git add $CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md $CHAPTER_DIR/${PADDED_CHAPTER}-01-RESEARCH.md
git commit -m "docs(chapter-${CHAPTER_NUMBER}): create chapter beat sheet with research"
```

**Report completion:**

```
Chapter $CHAPTER_NUMBER plan complete:
  PLAN.md: $CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md

Next steps:
  - Write the chapter: /gtd:write-chapter $CHAPTER_NUMBER
  - Or discuss further: /gtd:discuss-chapter $CHAPTER_NUMBER
```

</step>

</process>

<terminology>

## Thesis-Native Terminology

| Thesis Term | NOT This |
|-------------|----------|
| Chapter plan | Phase plan |
| Beat sheet | Task list |
| Section | Task |
| Approved | Verified |
| Chapter | Phase |
| Feedback | Bug report |
| Author | User |
| Thesis | Book |
| Advisor | Editor |

All communication with the author uses the left column. The right column terms never appear in author-facing messages.

</terminology>

<context_efficiency>

## Context Budget

This workflow stays at ~10-15% context by:

1. **Passing paths to agents, not content.** The planner agent reads canonical context itself with a fresh 200K window.
2. **Agents read context via CLI.** The planner runs `gtd-tools.js context --chapter N` independently.
3. **Workflow reads only for the checkpoint.** The only content the workflow loads is PLAN.md for the approval checkpoint.
4. **Research is delegated.** If research is requested, a separate agent handles it with its own context window.

</context_efficiency>

<error_handling>

## Error Recovery

**Missing canonical documents:**
- Specific error messages for each missing document (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md)
- Direct the author to `/gtd:new-thesis` to create the canonical documents

**Researcher agent fails:**
- Warn but continue to planning -- research is supplementary
- "Research could not be completed. Proceeding with planning from canonical context."

**Planner agent fails:**
- Report the error with any available details
- Offer retry: spawn the planner again with the same context
- If repeated failure: suggest checking that STRUCTURE.md has a valid entry for this chapter

**Chapter directory creation fails:**
- Report the error with the attempted path
- Common cause: invalid characters in slug derived from chapter title

</error_handling>

<what_not_to_do>

## What NOT To Do

- Do NOT copy steps from write-chapter.md -- this is a focused plan-only workflow
- Do NOT proceed to writing after plan approval
- Do NOT load the chapter draft (it does not exist yet)
- Do NOT read the full canonical bundle in the orchestrator -- let the planner agent do that
- Do NOT skip the approval checkpoint -- the author must approve the plan

</what_not_to_do>
