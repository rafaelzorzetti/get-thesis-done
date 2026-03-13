<purpose>
Orchestrate the academic review pipeline for a thesis chapter draft: spawn the reviewer agent, present findings to the author at a checkpoint, optionally enter a revision cycle (re-spawn the writer agent with review findings, then re-review), and finalize the approved chapter. This workflow manages the decision loop and enforces a 2-cycle revision cap.
</purpose>

<core_principle>
Orchestrator coordinates, agents evaluate and revise. This workflow never reviews prose or writes prose -- it spawns the reviewer agent to produce REVIEW.md, presents findings to the author, and spawns the writer agent for targeted revisions. All editorial analysis happens in fresh agent contexts with their own 200K windows.
</core_principle>

<terminology>

## Thesis-Native Terminology

This workflow uses thesis-native terminology throughout. The mapping:

| This Workflow Says | NOT This |
|--------------------|----------|
| chapter | phase |
| review | verification |
| finding | issue |
| revision | fix |
| draft | implementation |
| check category | test suite |
| approved | verified |
| review report | verification report |
| revision cycle | fix iteration |
| reviewer | verifier |
| thesis | book |
| advisor | editor |
| FRAMEWORK.md | BIBLE.md |
| STRUCTURE.md | OUTLINE.md |
| DRAFT.tex | DRAFT.md |
| gtd-tools.js | gwd-tools.js |
| get-thesis-done | get-writing-done |
| /gtd:* | /gwd:* |

All communication with the author uses the left column. The right column terms never appear in author-facing messages.

</terminology>

<process>

<step name="initialize" priority="first">

## Step 1: Initialize

Receive chapter number from user (e.g., `/gtd:review-chapter 3`).

**Validate prerequisites:**

```bash
# Check chapter has been drafted
node ~/.claude/get-thesis-done/bin/gtd-tools.js progress
```

Parse the output. Verify this chapter's status is "drafted" or later (reviewed, final). If the chapter has no draft:

```
Chapter N has no draft to review. Run the writing workflow first:
  /gtd:write-chapter N
```

If the chapter's status is already "reviewed" or "final", inform the author:

```
Chapter N has already been reviewed (status: {status}).
Proceeding will create a fresh review of the current draft.
Type "continue" to proceed or "cancel" to stop.
```

**Determine chapter paths:**

```bash
# Get chapter directory from thesis context
CONTEXT_META=$(node ~/.claude/get-thesis-done/bin/gtd-tools.js context --chapter $CHAPTER_NUMBER)
```

From the chapter directory (`.planning/chapters/NN-slug/`):
- Draft path: `$CHAPTER_DIR/$PADDED-01-DRAFT.tex` (the Wave 2 polished draft)
- Plan path: `$CHAPTER_DIR/$PADDED-01-PLAN.md` (the beat sheet)
- Review output path: `$CHAPTER_DIR/$PADDED-01-REVIEW.md`

**Verify draft file exists:**

```bash
[ -f "$CHAPTER_DIR/$PADDED-01-DRAFT.tex" ] && echo "Draft found" || echo "ERROR: Draft not found"
```

If the draft does not exist, report the error:

```
Chapter N has no DRAFT.tex. Run the writing workflow first:
  /gtd:write-chapter N
```

**Initialize revision tracking:**

```
revision_count = 0
max_revisions = 2
current_draft_path = $CHAPTER_DIR/$PADDED-01-DRAFT.tex
```

</step>

<step name="spawn_reviewer">

## Step 2: Spawn Reviewer

Spawn the `reviewer` agent to produce REVIEW.md.

**Initial review (revision_count == 0):**

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/reviewer.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <draft_path>$current_draft_path</draft_path>
    <plan_path>$CHAPTER_DIR/$PADDED-01-PLAN.md</plan_path>
    <output_path>$CHAPTER_DIR/$PADDED-01-REVIEW.md</output_path>
  ",
  description="Review Chapter $CHAPTER_NUMBER"
)
```

**Re-review after revision (revision_count > 0):**

When re-reviewing after a revision cycle, the reviewer needs to know it is in re-verification mode. Pass the previous review and the revised draft:

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/reviewer.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <draft_path>$current_draft_path</draft_path>
    <plan_path>$CHAPTER_DIR/$PADDED-01-PLAN.md</plan_path>
    <previous_review_path>$CHAPTER_DIR/$PADDED-01-REVIEW.md</previous_review_path>
    <output_path>$CHAPTER_DIR/$PADDED-01-REVIEW.md</output_path>

    <re_verification>
    This is a RE-REVIEW after revision cycle $revision_count.
    Read the previous REVIEW.md at <previous_review_path> first.
    Focus deep verification on previously FAILED items.
    Quick regression check on previously PASSED items.
    Report changes as FIXED / STILL_FAILING / REGRESSED / STILL_PASSING.
    </re_verification>
  ",
  description="Re-review Chapter $CHAPTER_NUMBER (cycle $revision_count)"
)
```

**After completion:** Verify the REVIEW.md was produced:

```bash
[ -f "$CHAPTER_DIR/$PADDED-01-REVIEW.md" ] && echo "REVIEW.md created" || echo "ERROR: REVIEW.md not created"
```

If the reviewer agent failed, report the error and offer to retry:

```
The reviewer did not produce a REVIEW.md.
Type "retry" to spawn the reviewer again, or describe what went wrong.
```

</step>

<step name="review_checkpoint">

## Step 3: Review Checkpoint

Read the produced REVIEW.md and present findings to the author.

```bash
# Read the review report
cat "$CHAPTER_DIR/$PADDED-01-REVIEW.md"
```

**Parse the review frontmatter** to extract:
- `status`: PASSED / NEEDS_REVISION / FAILED
- `score`: N/M checks passed
- `re_review`: true/false
- `previous_score`: N/M (only if re_review)
- `failed_checks`: list of failed items with category, evidence, and fix

**Present to the author:**

```
## Chapter $CHAPTER_NUMBER Review Complete

**Status:** $STATUS
**Score:** $PASSED/$TOTAL checks passed
```

**If this is a re-review (revision_count > 0):**

```
**Previous score:** $PREVIOUS_SCORE
**Change:** [improved/same/worsened]

### What Changed
[For each previously failed item, show: FIXED / STILL_FAILING / REGRESSED]
[For each previously passed item that regressed: REGRESSED (highlight)]
```

**For all reviews, show category breakdown:**

```
### Category Breakdown

| Category | Status | Checks |
|----------|--------|--------|
| Citation Validity | $cat1_status | $cat1_passed/$cat1_total |
| Methodological Rigor | $cat2_status | $cat2_passed/$cat2_total |
| Argumentative Coherence | $cat3_status | $cat3_passed/$cat3_total |
| Formatting Norms | $cat4_status | $cat4_passed/$cat4_total |

### Critical Findings (must address)
[List each critical finding with evidence quote and suggested fix]

### Minor Findings (recommendations)
[List at least 3 improvement suggestions]

### Full Review Report
See: $CHAPTER_DIR/$PADDED-01-REVIEW.md

---
Options:
- Type "approved" -- chapter passes review, proceed to finalization
- Type "fix" -- enter revision cycle (writer fixes failed items, then re-review)
- Type "skip [check_name]" -- override a specific failed check (accept the finding)
- Any other text -- treated as additional feedback to include in revision instructions
```

**Handling author response:**

- **"approved"**: Proceed to Step 5 (Finalize). The chapter passes review regardless of remaining findings.
- **"fix"**: Proceed to Step 4 (Revision Cycle). The writer will receive the failed checks as revision instructions.
- **"skip [check_name]"**: Remove the named check from failed_checks, recalculate score. If all remaining checks pass, present updated status and ask again. If still failing, present updated findings and ask again.
- **Any other text**: Treat as author feedback. Proceed to Step 4 (Revision Cycle) with the feedback appended to the revision instructions alongside the failed_checks.

</step>

<step name="revision_cycle">

## Step 4: Revision Cycle

Only entered when the author chose "fix" or provided feedback text.

**Check revision cap:**

```
revision_count = revision_count + 1
```

If `revision_count > max_revisions` (i.e., more than 2 revision cycles attempted):

```
## Revision Limit Reached

You have completed $max_revisions revision cycles for Chapter $CHAPTER_NUMBER.
The following findings remain unresolved:

[List remaining failed checks with evidence]

Options:
- Type "approved" -- accept the chapter with these known findings
- Type "edit" -- manually edit the draft at $current_draft_path, then type "re-review"
- Type "rewrite" -- re-run the full writing workflow for this chapter

The revision cycle will not run again automatically.
```

Wait for the author's response:
- **"approved"**: Proceed to Step 5 (Finalize) with current state
- **"edit"** then **"re-review"**: Reset revision_count to 0, loop back to Step 2
- **"rewrite"**: Exit this workflow. The author should run `/gtd:write-chapter N` to start fresh.

**If within revision cap, prepare revision instructions:**

Extract from REVIEW.md:
- All `failed_checks` entries with their category, evidence, and suggested fix
- The `Revision Instructions` section (numbered, specific, paragraph-level instructions)
- Any author feedback text provided at the checkpoint

**Determine revision output path:**

```
revision_draft_path = $CHAPTER_DIR/$PADDED-01-DRAFT-r${revision_count}.tex
```

**Spawn the writer agent for revision:**

Re-use the `writer` agent in Wave 2 mode. The writer receives the current draft as input and the review findings as revision instructions. The output is a `.tex` file.

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/writer.md for your role and instructions.

    <wave>2</wave>
    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <plan_path>$CHAPTER_DIR/$PADDED-01-PLAN.md</plan_path>
    <wave1_draft_path>$current_draft_path</wave1_draft_path>
    <output_path>$revision_draft_path</output_path>

    <revision>
    The academic reviewer found findings in the current draft.
    Fix ONLY the items listed below. Preserve everything else.
    Do not restructure. Do not rewrite passages that are not listed.

    ## Review Findings to Fix

    $FAILED_CHECKS_WITH_NUMBERED_FIX_INSTRUCTIONS

    ## Author Feedback

    $AUTHOR_FEEDBACK_IF_ANY
    </revision>
  ",
  description="Revise Chapter $CHAPTER_NUMBER (fixing review findings, cycle $revision_count)"
)
```

**After completion:** Verify the revised draft was created:

```bash
[ -f "$revision_draft_path" ] && echo "Revised draft created" || echo "ERROR: Revised draft not created"
```

If the writer agent failed, report the error and offer options:

```
The writer did not produce a revised draft.
Options:
  - Type "retry" to attempt the revision again
  - Type "approved" to accept the current draft as-is
  - Describe the issue for investigation
```

**Update tracking and loop back to review:**

```
current_draft_path = $revision_draft_path
```

Loop back to Step 2 (Spawn Reviewer) in re-verification mode. The reviewer will receive the revised draft and the previous REVIEW.md for focused re-verification.

</step>

<step name="finalize">

## Step 5: Finalize

Only entered when the author types "approved" at any checkpoint.

**If the approved draft is a revision (revision_count > 0):**

The approved draft is at `$CHAPTER_DIR/$PADDED-01-DRAFT-r${revision_count}.tex`. Copy it to the canonical draft path to establish it as the final approved version:

```bash
cp "$CHAPTER_DIR/$PADDED-01-DRAFT-r${revision_count}.tex" "$CHAPTER_DIR/$PADDED-01-DRAFT.tex"
```

The revision files (`DRAFT-r1.tex`, `DRAFT-r2.tex`) are preserved for audit trail. The canonical `DRAFT.tex` is now the approved version.

**Copy final draft to src/chapters/ for compilation:**

The approved draft lives in `.planning/chapters/NN-slug/NN-01-DRAFT.tex` (the agent workspace). For `/gtd:compile` to include this chapter in the PDF, the content must be copied to `src/chapters/NN-slug.tex` -- the path that `main.tex` references via `\include{chapters/NN-slug}`.

```bash
# Determine the target path: src/chapters/NN-slug.tex
CHAPTER_SLUG="${PADDED}-${SLUG}"
SRC_CHAPTER_PATH="src/chapters/${CHAPTER_SLUG}.tex"

# Ensure the src/chapters directory exists
mkdir -p src/chapters

# Copy the approved draft to the compilation source tree
cp "$CHAPTER_DIR/$PADDED-01-DRAFT.tex" "$SRC_CHAPTER_PATH"
```

**Commit the review artifacts:**

```bash
git add "$CHAPTER_DIR/$PADDED-01-REVIEW.md"
git add "$CHAPTER_DIR/$PADDED-01-DRAFT.tex"
git add "$SRC_CHAPTER_PATH"
```

If revisions were made, also add the revision drafts:

```bash
# Add each revision artifact
for i in $(seq 1 $revision_count); do
  git add "$CHAPTER_DIR/$PADDED-01-DRAFT-r${i}.tex"
done
```

Commit all review artifacts together:

```bash
git commit -m "docs(ch${PADDED}): review complete for chapter ${CHAPTER_NUMBER} (${STATUS})"
```

**Report completion:**

```
## Chapter $CHAPTER_NUMBER Review Complete

**Status:** $STATUS
**Score:** $SCORE
**Revision cycles:** $revision_count

**Files produced:**
  - $CHAPTER_DIR/$PADDED-01-REVIEW.md (review report)
  [If revisions:]
  - $CHAPTER_DIR/$PADDED-01-DRAFT-r1.tex (revision 1)
  [- $CHAPTER_DIR/$PADDED-01-DRAFT-r2.tex (revision 2)]
  - $CHAPTER_DIR/$PADDED-01-DRAFT.tex (final approved draft)
  - src/chapters/${CHAPTER_SLUG}.tex (compilation copy)

**Next steps:**
  Chapter is ready for the continuity loop (FRAMEWORK.md update + SUMMARY.md generation).
```

**Return status to caller:** Set `review_status = "approved"` so the calling command (`/gtd:review-chapter`) can chain to the continuity loop.

</step>

</process>

<checkpoint_rules>

## Checkpoint Presentation Rules

Exactly 1 checkpoint per review pass:
- **After review completion** -- the author sees the findings and decides: approve, fix, or skip

**NO checkpoint between revision and re-review.** When the author chooses "fix", the revision and re-review happen as a single cycle. The author sees results at the next review checkpoint.

**Present findings for decision, not raw data for analysis:**
- The review checkpoint shows the status, score, category breakdown, critical findings with evidence, and minor recommendations
- The author does not need to read the full REVIEW.md at the checkpoint -- the workflow extracts and presents the key information
- The full REVIEW.md path is provided for deep-dive reference

**Clear decision signals:**
- "approved" to finalize (any time, even with remaining findings)
- "fix" to enter revision cycle
- "skip [check_name]" to override a specific failed check
- Any other text is treated as additional feedback for revision

</checkpoint_rules>

<revision_cycle_rules>

## Revision Cycle Rules

**Maximum 2 revision cycles.** After 2 cycles, the workflow stops and forces an author decision. This prevents infinite loops where the reviewer and writer oscillate on the same findings.

**Each cycle is: revision + re-review.** The writer receives specific fix instructions (not vague feedback). The reviewer re-runs in re-verification mode (focused on previously failed items, quick regression on passed items).

**The writer is the existing `writer.md` agent.** Do NOT create a new revision agent. The `writer.md` in Wave 2 mode with revision instructions appended is exactly the right tool. The writer's persona override and style enforcement handle the prose quality during revision.

**Revision is targeted, not full rewrite.** The revision instructions list specific paragraphs, specific findings, and specific fixes. The writer is told to "fix ONLY the items listed below, preserve everything else." This prevents the common failure mode where revision rewrites the entire chapter and introduces new problems.

**Re-review is focused, not full review.** The reviewer in re-verification mode focuses deep verification on previously failed items and runs quick regression on previously passed items. This is faster than a full review.

**Revision drafts use .tex extension.** DRAFT-r1.tex, DRAFT-r2.tex -- consistent with the LaTeX-native output pipeline. No Markdown intermediaries.

</revision_cycle_rules>

<error_handling>

## Error Recovery

**Reviewer agent fails:**
- Report the error with any available details
- Offer retry: spawn the reviewer again with the same context
- If repeated failure: suggest checking that the draft file exists and is readable

**Writer revision fails:**
- Report the error
- Offer options:
  1. Retry the revision
  2. Accept the current draft as-is (proceed to finalize)
  3. Investigate the issue

**Missing draft:**
- Clear error message: "Chapter N has no DRAFT.tex to review. Run the writing workflow first."
- Direct the author to `/gtd:write-chapter N`

**Missing PLAN.md:**
- Warn but allow review: "No beat sheet found for Chapter N. The reviewer will run without thread/continuity checks against the plan. Consider running the writing workflow to generate a PLAN.md."
- The reviewer can still check citation validity, methodological rigor, argumentative coherence, and formatting norms without the PLAN.md. Only the argumentative coherence check (Category 3) is partially degraded without thread cross-referencing.

**Revision cap reached:**
- Present remaining findings clearly
- Offer three paths: approve with known findings, manually edit, or rewrite
- Do NOT silently continue revision cycles

**REVIEW.md parse error:**
- If the REVIEW.md frontmatter cannot be parsed, report the error
- Offer to re-run the reviewer (the previous REVIEW.md may have been malformed)
- Show the raw file path so the author can inspect it manually

</error_handling>

<context_efficiency>

## Context Budget

This workflow stays at ~10-15% context by:

1. **Passing paths to agents, not content.** The reviewer reads the draft, PLAN.md, and canonical context independently. The writer reads the draft and PLAN.md independently. Each agent starts with a fresh 200K window.
2. **Agents load context via CLI.** Each agent runs `gtd-tools.js context --chapter N` to get the canonical bundle (FRAMEWORK.md + STYLE_GUIDE.md + STRUCTURE.md + summaries).
3. **Workflow reads only for checkpoints.** The only content the workflow loads is REVIEW.md (to present findings at the checkpoint). The draft itself is never loaded by the workflow -- only by the agents.
4. **No context accumulation between cycles.** Each revision cycle spawns fresh agents. The workflow tracks only: revision_count, current_draft_path, and the REVIEW.md path.

**What NOT to do:**
- Do NOT read the full draft in the workflow -- pass the path to agents
- Do NOT read the full canonical context in the workflow -- agents load it themselves
- Do NOT accumulate review findings across cycles in the workflow's memory -- each REVIEW.md is self-contained with re-verification tracking

</context_efficiency>

<what_not_to_do>

## Explicit Anti-Patterns

**Do NOT add checkpoints between revision and re-review.** The only checkpoint is Step 3 where the author decides. The revision + re-review cycle runs as one unit.

**Do NOT allow more than 2 revision cycles without forcing an author decision.** After 2 cycles, the workflow must stop and present remaining findings. The author must choose: approve, edit manually, or rewrite.

**Do NOT create a new revision agent.** Re-use the `writer.md` in Wave 2 mode with revision instructions appended. The writer already supports this via the `<revision>` block in its prompt.

**Do NOT read the full draft in the workflow.** Pass paths to agents. Let agents read with their fresh 200K context windows. This is the context efficiency principle.

**Do NOT mark the chapter as "reviewed" in thesis progress.** That responsibility belongs to the continuity loop and lifecycle management. This workflow only produces the review gate artifacts (REVIEW.md and optionally revised drafts).

**Do NOT let the reviewer run without a draft.** The initialization step validates that a DRAFT.tex exists before spawning the reviewer. A chapter must be drafted before it can be reviewed.

**Do NOT pass review findings as prose summaries.** Pass the specific `failed_checks` entries with paragraph numbers, evidence quotes, and suggested fixes. The writer needs actionable, numbered instructions -- not "the methodology needs work."

**Do NOT use .md extension for draft files.** All drafts are LaTeX-native: DRAFT.tex, DRAFT-r1.tex, DRAFT-r2.tex. The thesis pipeline produces .tex files directly.

</what_not_to_do>

<success_criteria>

## Verification

A successful chapter review run produces:

- [ ] REVIEW.md exists in the chapter directory with valid YAML frontmatter
- [ ] Review status is one of: PASSED, NEEDS_REVISION, FAILED
- [ ] Score is recorded as N/M checks passed
- [ ] All 4 check categories are evaluated in the review (citation_validity, methodological_rigor, argumentative_coherence, formatting_norms)
- [ ] Critical findings include evidence (quotes from text) and suggested fixes
- [ ] At least 3 minor improvement suggestions exist, even for passing chapters
- [ ] Author was presented findings at a checkpoint and made an explicit decision
- [ ] If revision occurred: revised draft exists at `NN-01-DRAFT-r{N}.tex`
- [ ] If revision occurred: re-review ran in re-verification mode with FIXED/STILL_FAILING/REGRESSED tracking
- [ ] Revision cycles did not exceed 2 without author decision
- [ ] If approved after revision: canonical `NN-01-DRAFT.tex` updated with approved version
- [ ] Final DRAFT.tex copied to src/chapters/NN-slug.tex for compilation
- [ ] All review artifacts committed
- [ ] All terminology in author-facing messages is thesis-native

</success_criteria>
