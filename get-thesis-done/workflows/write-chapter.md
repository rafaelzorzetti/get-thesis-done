<purpose>
Orchestrate the full chapter writing pipeline from plan creation through draft completion with human checkpoints. This workflow receives a chapter number and manages the plan-approve-write-review cycle. It stays lean (~10-15% context) by delegating all prose generation to subagents.
</purpose>

<core_principle>
Orchestrator coordinates, agents create. This workflow never writes prose -- it assembles context, spawns agents, handles checkpoints, and manages state. All heavy lifting (beat-sheet creation, draft writing, style enforcement) happens in fresh agent contexts with their own 200K windows.
</core_principle>

<process>

<step name="initialize" priority="first">

## Step 1: Initialize

Receive chapter number from user (e.g., `/gtd:write-chapter 3`).

**Validate prerequisites:**

```bash
# Check canonical documents exist (JSON mode)
CONTEXT_META=$(node ~/.claude/get-thesis-done/bin/gtd-tools.js context --chapter $CHAPTER_NUMBER)
```

Parse the JSON output. Verify:
- `has_framework` is true -- if false, error: "No FRAMEWORK.md found. Create canonical documents with /gtd:new-thesis first."
- `has_style` is true -- if false, error: "No STYLE_GUIDE.md found. Create canonical documents with /gtd:new-thesis first."
- `has_structure` is true -- if false, error: "No STRUCTURE.md found. Create canonical documents with /gtd:new-thesis first."

**Check chapter status:**

```bash
# Check if chapter has already been drafted
node ~/.claude/get-thesis-done/bin/gtd-tools.js progress
```

If this chapter's status is `drafted` or beyond (`reviewed`, `final`), warn the author:

```
This chapter already has a draft (status: {status}).
Proceeding will create a new draft alongside the existing one.
Type "continue" to proceed or "cancel" to stop.
```

**Create chapter directory:**

```bash
# Derive slug from STRUCTURE.md chapter title (lowercase, hyphenated, ASCII-safe)
# Example: "Revisao da Literatura" -> "revisao-da-literatura"
mkdir -p .planning/chapters/${PADDED_CHAPTER}-${SLUG}
```

Where `PADDED_CHAPTER` is the zero-padded chapter number (e.g., `03`) and `SLUG` is derived from the chapter title in STRUCTURE.md.

**Load context metadata for reporting:**

From the JSON output, note `summary_count` and `token_estimate` for status messages.

</step>

<step name="spawn_planner">

## Step 2: Spawn Planner Agent

Check for an existing PLAN.md first. If the author already ran `/gtd:plan-chapter`, offer to reuse it:

```bash
ls .planning/chapters/${PADDED_CHAPTER}-*/${PADDED_CHAPTER}-01-PLAN.md 2>/dev/null
```

If PLAN.md exists:
```
Chapter $CHAPTER_NUMBER already has a PLAN.md.
Type "reuse" to keep the existing plan, or "replan" to create a new one.
```

- **reuse:** Skip planning, proceed to Step 3 with existing PLAN.md
- **replan:** Continue with planner spawning below

If no PLAN.md exists, spawn the `planner` agent via Task():

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

The planner agent reads canonical context itself via `gtd-tools.js context` (context isolation principle -- each agent starts with a fresh window).

**After completion:** Verify the PLAN.md file was created:

```bash
[ -f "$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md" ] && echo "PLAN created" || echo "ERROR: PLAN.md not created"
```

If the planner agent failed, report the error and offer to retry:

```
The chapter planner did not produce a PLAN.md.
Type "retry" to spawn the planner again, or describe what went wrong.
```

</step>

<step name="plan_checkpoint">

## Step 3: Plan Approval Checkpoint

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
Type "approved" to proceed to writing, or provide feedback to revise the plan.
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

**If the author types "approved":** Proceed to Wave 1 writing.

</step>

<step name="wave1_structural_draft">

## Step 4: Wave 1 -- Structural Draft in LaTeX

Spawn the `writer` agent for Wave 1 (structural draft).

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/writer.md for your role and instructions.

    <wave>1</wave>
    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <plan_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md</plan_path>
    <output_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT-w1.tex</output_path>
  ",
  description="Write Chapter $CHAPTER_NUMBER (Wave 1: Structure)"
)
```

Note output is `.tex` not `.md`. The writer agent produces LaTeX-native content.

**After completion:** Verify the Wave 1 draft was created:

```bash
[ -f "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT-w1.tex" ] && echo "Wave 1 draft created" || echo "ERROR: Wave 1 draft not created"
```

If the writer agent failed, report the error and offer to retry:

```
Wave 1 writing did not produce a draft.
Type "retry" to spawn the writer again, or describe what went wrong.
```

**No checkpoint between waves.** The structural draft goes directly to prose polish. This avoids checkpoint fatigue -- the author reviews the polished result, not the intermediate structure.

</step>

<step name="wave2_prose_polish">

## Step 5: Wave 2 -- Prose Polish in LaTeX

Spawn the `writer` agent again for Wave 2 (prose polish).

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/writer.md for your role and instructions.

    <wave>2</wave>
    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <plan_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md</plan_path>
    <wave1_draft_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT-w1.tex</wave1_draft_path>
    <output_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex</output_path>
  ",
  description="Write Chapter $CHAPTER_NUMBER (Wave 2: Polish)"
)
```

**After completion:** Verify the final draft was created:

```bash
[ -f "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex" ] && echo "Final draft created" || echo "ERROR: Final draft not created"
```

If the writer agent failed on Wave 2, report the error and offer options:

```
Wave 2 polish did not produce a final draft.
Options:
  - Type "retry" to attempt Wave 2 again
  - Type "accept wave 1" to use the structural draft as the final draft
  - Describe the issue for investigation
```

If the author chooses "accept wave 1", copy the Wave 1 draft as the final draft:

```bash
cp "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT-w1.tex" "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex"
```

</step>

<step name="citation_validation">

## Step 6: Citation Validation

After Wave 2, validate citations against the project's references.bib:

```bash
# Attempt citation validation via CLI (may not exist yet if Plan 02-03 not done)
node ~/.claude/get-thesis-done/bin/gtd-tools.js validate-citations --chapter $CHAPTER_NUMBER 2>/dev/null
CITE_EXIT=$?
```

If the `validate-citations` command exists (`$CITE_EXIT` is 0), parse results and collect any invalid citation keys.

If it does not exist (command not found or non-zero exit), fall back to a basic check:

```bash
# Fallback: extract \cite{} keys from draft and check against references.bib
CITE_KEYS=$(grep -oP '\\cite\{[^}]+\}' "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex" | \
  sed 's/\\cite{//;s/}//' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | sort -u)

if [ -f "src/references.bib" ]; then
  echo "$CITE_KEYS" | while read KEY; do
    grep -q "$KEY" src/references.bib || echo "WARNING: Citation key not found in references.bib: $KEY"
  done
else
  echo "NOTE: No references.bib found at src/references.bib -- citation validation skipped"
fi
```

Store citation validation results (warnings about invalid keys) to present alongside the draft review in Step 7.

</step>

<step name="draft_checkpoint">

## Step 7: Draft Review Checkpoint

Read the final .tex draft and present it to the author for review.

```bash
# Read the draft
cat "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex"

# Count words (approximate for LaTeX -- strips commands)
WORD_COUNT=$(wc -w < "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex")

# Count sections
SECTION_COUNT=$(grep -c "\\\\section{" "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex")

# Count sections in plan for comparison
PLAN_SECTIONS=$(grep "^sections:" "$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md" | awk '{print $2}')
```

**Quick quality checks before presenting:**

- Section count matches plan (`$SECTION_COUNT` should approximate `$PLAN_SECTIONS`)
- Scan for obvious assistant-tone markers (academic versions):
  ```bash
  # Check for common assistant-tone phrases in Portuguese academic writing
  grep -i -c "importante notar\|em resumo\|nesta secao\|como veremos\|vamos explorar\|e possivel argumentar" "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex"
  ```
  If any found, note them in the presentation.

Present to the author:

```
## Chapter $CHAPTER_NUMBER Draft Ready for Review

**Title:** [chapter title]
**Word count:** ~$WORD_COUNT words (LaTeX source)
**Sections:** $SECTION_COUNT (plan specified: $PLAN_SECTIONS)

[If citation validation issues found:]
**Citation warnings:**
- [key]: not found in references.bib

[If assistant-tone markers found:]
**Note:** Found [N] potential assistant-tone markers. Review these passages carefully.

---

[The full draft text]

[If the draft exceeds ~2000 words, show the first ~2000 words and note:]
[... draft continues. Full text at: $CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex]

---
Type "approved" to finalize, or provide feedback for revision.
```

**If the author provides feedback:**

Spawn the writer Wave 2 again with the feedback:

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/writer.md for your role and instructions.

    <wave>2</wave>
    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <plan_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md</plan_path>
    <wave1_draft_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT-w1.tex</wave1_draft_path>
    <output_path>$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex</output_path>

    <revision>
    The author reviewed the Wave 2 draft and provided this feedback:
    $AUTHOR_FEEDBACK

    Read the current draft at $CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex
    and revise it to address this feedback while preserving structure.
    </revision>
  ",
  description="Revise Chapter $CHAPTER_NUMBER Draft"
)
```

After revision, re-run citation validation (Step 6) and present the updated draft again for review. Repeat until the author types "approved".

**If the author types "approved":** Proceed to finalization.

</step>

<step name="finalize">

## Step 8: Finalize

The draft is approved. Wrap up the chapter.

**1. Attempt LaTeX sanitization (if available):**

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js sanitize --chapter $CHAPTER_NUMBER 2>/dev/null
SANITIZE_EXIT=$?
if [ $SANITIZE_EXIT -ne 0 ]; then
  echo "NOTE: sanitize command not available -- skipping automated sanitization"
fi
```

**2. Copy final DRAFT.tex to src/chapters/ for compilation (CRITICAL):**

The approved draft lives in `.planning/chapters/NN-slug/NN-01-DRAFT.tex` (the agent workspace). For `/gtd:compile` to include this chapter in the PDF, the content must be copied to `src/chapters/NN-slug.tex` -- the path that `main.tex` references via `\include{chapters/NN-slug}`.

```bash
# Determine the target path: src/chapters/NN-slug.tex
# The slug comes from the chapter directory name (e.g., 01-introduction -> src/chapters/01-introduction.tex)
CHAPTER_SLUG="${PADDED_CHAPTER}-${SLUG}"
SRC_CHAPTER_PATH="src/chapters/${CHAPTER_SLUG}.tex"

# Ensure the src/chapters directory exists
mkdir -p src/chapters

# Copy the approved draft to the compilation source tree
cp "$CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex" "$SRC_CHAPTER_PATH"
```

This is the bridge between the writing pipeline (.planning/ workspace) and the compilation pipeline (src/ tree). Without this copy, `/gtd:compile` would produce a PDF with only the chapter stub placeholders.

**Verify the copy matches main.tex:**

Check that `main.tex` has a `\include{chapters/${CHAPTER_SLUG}}` line. If it does not (e.g., the chapter was not included during initialization), warn the author:

```bash
grep -q "include{chapters/${CHAPTER_SLUG}}" src/main.tex && echo "Chapter included in main.tex" || echo "WARNING: Add \\include{chapters/${CHAPTER_SLUG}} to src/main.tex"
```

**3. Attempt summary template scaffold (if available):**

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js summary extract --chapter $CHAPTER_NUMBER 2>/dev/null
SUMMARY_EXIT=$?
if [ $SUMMARY_EXIT -ne 0 ]; then
  echo "NOTE: summary extract command not available -- skipping summary template"
fi
```

**4. Commit all chapter files (both .planning/ workspace and src/ compilation):**

```bash
git add "$CHAPTER_DIR/" "$SRC_CHAPTER_PATH"
git commit -m "feat(chapter-${CHAPTER_NUMBER}): complete chapter writing pipeline"
```

**5. Report completion with thesis-native terminology:**

```
## Chapter $CHAPTER_NUMBER Complete

**Title:** [title]
**Word count:** ~$WORD_COUNT words
**Files created:**
  - $CHAPTER_DIR/$PADDED_CHAPTER-01-PLAN.md (beat sheet)
  - $CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT-w1.tex (structural draft)
  - $CHAPTER_DIR/$PADDED_CHAPTER-01-DRAFT.tex (final draft)
  - src/chapters/${CHAPTER_SLUG}.tex (compilation copy)
  [If summary template created:]
  - $CHAPTER_DIR/$PADDED_CHAPTER-01-SUMMARY.md (summary template)

**Next steps:**
  Review at your leisure, then run /gtd:review-chapter $CHAPTER_NUMBER when ready.
  To compile: /gtd:compile
```

</step>

</process>

<checkpoint_rules>

## Checkpoint Presentation Rules

Exactly 2 checkpoints per chapter:
1. **After plan creation** -- author approves the chapter direction and beat-sheet structure
2. **After Wave 2 draft completion + citation validation** -- author reviews the actual prose and citation health

**NO checkpoint between Wave 1 and Wave 2.** The structural draft goes directly to prose polish. This avoids checkpoint fatigue.

**Present prose for reading, not metadata for inspection:**
- The plan checkpoint shows the beat-sheet structure in human-readable format with section summaries, planned citations, and methodology
- The draft checkpoint shows the actual prose text and any citation warnings for the author to review

**Clear resume signals:**
- "approved" to continue
- Any other text is treated as feedback for revision

</checkpoint_rules>

<terminology>

## Thesis-Native Terminology

This workflow uses thesis-native terminology throughout. The mapping:

| Thesis Term | NOT This |
|-------------|----------|
| Chapter plan | Phase plan |
| Beat sheet | Task list |
| Section | Task |
| Draft | Implementation |
| Wave 1: structural draft | Wave 1: scaffolding |
| Wave 2: prose polish | Wave 2: refinement pass |
| Approved | Verified |
| Chapter | Phase |
| Feedback | Bug report |
| Author | User |
| Thesis | Book |
| Advisor | Editor |

All communication with the author uses the left column. The right column terms never appear in author-facing messages.

</terminology>

<error_handling>

## Error Recovery

**Planner agent fails:**
- Report the error with any available details
- Offer retry: spawn the planner again with the same context
- If repeated failure: suggest checking that STRUCTURE.md has a valid entry for this chapter

**Writer agent fails on Wave 1:**
- Report the error
- Offer retry: spawn the writer again
- If repeated failure: suggest checking that the PLAN.md is well-formed

**Writer agent fails on Wave 2:**
- Report the error
- Offer options:
  1. Retry Wave 2
  2. Accept the Wave 1 structural draft as the final draft
  3. Investigate the issue

**Chapter directory creation fails:**
- Report the error with the attempted path
- Common cause: invalid characters in slug derived from chapter title
- Suggest checking the STRUCTURE.md chapter title for special characters

**Missing canonical documents:**
- Specific error messages for each missing document (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md)
- Direct the author to `/gtd:new-thesis` to create the canonical documents

**Citation validation fails:**
- If validate-citations CLI not available: fallback grep check runs automatically
- If references.bib not found: note and skip (author may not have added references yet)
- Invalid citation keys: report as warnings, do not block draft approval

</error_handling>

<context_efficiency>

## Context Budget

This workflow stays at ~10-15% context by:

1. **Passing paths to agents, not content.** Agents read canonical context themselves with fresh 200K windows.
2. **Agents read context via CLI.** Each agent runs `gtd-tools.js context --chapter N` independently.
3. **Workflow reads only for checkpoints.** The only content the workflow loads is PLAN.md (for plan checkpoint) and DRAFT.tex (for draft checkpoint) -- both are small reads relative to the 200K window.
4. **No context accumulation between waves.** Wave 1 output is a file path. Wave 2 reads it fresh.

</context_efficiency>

<success_criteria>

## Verification

A successful chapter writing run produces:

- [ ] Chapter PLAN.md exists with complete beat sheet (all sections have purpose, arguments, terms, threads, opening, length)
- [ ] Wave 1 draft exists as .tex file with structural content matching the beat sheet
- [ ] Final draft exists as .tex file (Wave 2 polished or Wave 1 accepted)
- [ ] Citation validation ran (CLI or fallback grep) and results reported
- [ ] Author approved both the plan and the draft through checkpoints
- [ ] Final DRAFT.tex copied to src/chapters/NN-slug.tex for compilation
- [ ] main.tex verified to include the chapter (or warning issued)
- [ ] All terminology in author-facing messages is thesis-native
- [ ] No assistant-tone markers in the final draft

</success_criteria>
