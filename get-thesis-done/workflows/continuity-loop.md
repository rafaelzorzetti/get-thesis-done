<purpose>
Orchestrate the post-review continuity update for a thesis chapter: spawn the framework-keeper agent to update FRAMEWORK.md, then spawn the summary-writer agent to fill SUMMARY.md, then verify the progressive context chain works. This workflow runs after a chapter passes the review gate and before the next chapter is planned/written.
</purpose>

<core_principle>
Orchestrator coordinates, agents extract. This workflow never reads the chapter draft or modifies FRAMEWORK.md directly -- it spawns agents that do the extraction work in fresh 200K context windows. The workflow tracks state (which step completed) and verifies the chain.
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
| continuity update | state sync |
| extraction | parsing |
| canonical record | database |
| thesis | book |
| advisor | editor |
| FRAMEWORK.md | BIBLE.md |
| STRUCTURE.md | OUTLINE.md |
| DRAFT.tex | DRAFT.md |
| framework-keeper | bible-keeper |
| gtd-tools.js | gwd-tools.js |
| get-thesis-done | get-writing-done |
| /gtd:* | /gwd:* |

All communication with the author uses the left column. The right column terms never appear in author-facing messages.

</terminology>

<process>

<step name="initialize" priority="first">

## Step 1: Initialize

Receive chapter number from the review workflow's finalization (chained by `/gtd:review-chapter`), or directly if run standalone.

**Validate prerequisites:**

```bash
# Get chapter context
CONTEXT_META=$(node ~/.claude/get-thesis-done/bin/gtd-tools.js context --chapter $CHAPTER_NUMBER)
```

Parse the output to determine paths.

**Verify review status:**

Read the REVIEW.md for this chapter and check its frontmatter status:

```bash
# Read REVIEW.md frontmatter
cat "$CHAPTER_DIR/$PADDED-01-REVIEW.md"
```

Parse the frontmatter. Verify `status` is "PASSED" or that the chapter was explicitly approved by the author during the review workflow. If the review status indicates the chapter was not approved:

```
Cannot run continuity loop on unapproved chapter.
Chapter $CHAPTER_NUMBER must pass the review gate first:
  /gtd:review-chapter $CHAPTER_NUMBER
```

If the chapter status is "drafted" or earlier, the continuity loop cannot run. Unreviewed content would corrupt FRAMEWORK.md and cascade into all subsequent chapters.

**Verify required files exist:**

```bash
# Check draft exists
[ -f "$CHAPTER_DIR/$PADDED-01-DRAFT.tex" ] && echo "Draft found" || echo "ERROR: Draft not found"

# Check PLAN.md exists
[ -f "$CHAPTER_DIR/$PADDED-01-PLAN.md" ] && echo "Plan found" || echo "ERROR: Plan not found"
```

If the draft does not exist: error -- "Chapter N has no DRAFT.tex. Run the writing workflow first."
If the PLAN.md does not exist: warn but allow proceeding -- "No beat sheet found. Extraction will proceed without plan cross-referencing."

**Determine paths:**

From the chapter directory (`.planning/chapters/NN-slug/`):
- Chapter directory: `$CHAPTER_DIR`
- Draft path: `$CHAPTER_DIR/$PADDED-01-DRAFT.tex`
- Plan path: `$CHAPTER_DIR/$PADDED-01-PLAN.md`
- Summary path: `$CHAPTER_DIR/$PADDED-01-SUMMARY.md`

**Calculate next chapter number:**

```
NEXT_CHAPTER_NUMBER = $CHAPTER_NUMBER + 1
```

</step>

<step name="create_summary_template">

## Step 2: Create SUMMARY.md Template

Check if the SUMMARY.md template exists. If not, scaffold it using the CLI:

```bash
# Check if SUMMARY.md exists
[ -f "$CHAPTER_DIR/$PADDED-01-SUMMARY.md" ] && echo "SUMMARY.md found" || echo "SUMMARY.md not found -- scaffolding"
```

If not found, create the 7-section template:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js summary extract --chapter $CHAPTER_NUMBER
```

The CLI handles write-once protection -- if the file already exists with real content, it will not overwrite.

</step>

<step name="cli_backup">

## Step 3: CLI Backup

Run the framework update CLI command to create a FRAMEWORK.md backup and update frontmatter/changelog BEFORE the framework-keeper agent modifies the content:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js framework update --chapter $CHAPTER_NUMBER
```

This command:
1. Creates `.planning/FRAMEWORK.md.bak` (backup of current state)
2. Updates frontmatter fields: `updated_after: "Ch NN"`, `last_updated: "YYYY-MM-DD"`
3. Appends a placeholder changelog row: `| Ch NN | YYYY-MM-DD | [Updated after chapter NN completion -- review needed] |`

**Verify backup was created:**

```bash
[ -f ".planning/FRAMEWORK.md.bak" ] && echo "Backup exists" || echo "WARNING: No backup found"
```

The backup ensures the framework-keeper agent's modifications can be rolled back if needed.

</step>

<step name="spawn_framework_keeper">

## Step 4: Spawn Framework-Keeper (FIRST)

**STRICT ORDERING: framework-keeper MUST complete before summary-writer starts.**

The summary-writer depends on the updated FRAMEWORK.md for cross-referencing vocabulary, thread states, and concept status. Running them in parallel or reversed order would produce inconsistent extractions.

Spawn the `framework-keeper` agent to update FRAMEWORK.md with entries extracted from the approved chapter draft:

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/framework-keeper.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <draft_path>$CHAPTER_DIR/$PADDED-01-DRAFT.tex</draft_path>
    <framework_path>.planning/FRAMEWORK.md</framework_path>
  ",
  description="Update FRAMEWORK.md for Chapter $CHAPTER_NUMBER"
)
```

**After the framework-keeper completes, verify FRAMEWORK.md was modified:**

```bash
# Check FRAMEWORK.md has a changelog entry for this chapter (not a placeholder)
grep -q "Ch $PADDED" .planning/FRAMEWORK.md && echo "Changelog entry found" || echo "WARNING: No changelog entry for this chapter"

# Check backup exists
[ -f ".planning/FRAMEWORK.md.bak" ] && echo "Backup exists" || echo "WARNING: No backup found"
```

Verify the changelog entry is real content (the framework-keeper should have replaced the CLI's placeholder):

```bash
# Check for placeholder text in the changelog for this chapter
grep "Ch $PADDED.*review needed" .planning/FRAMEWORK.md && echo "WARNING: Placeholder changelog still present -- framework-keeper may not have completed" || echo "Changelog entry is real"
```

**If the framework-keeper fails:**

```
The framework-keeper did not complete successfully.
Type "retry" to spawn the framework-keeper again, or describe what went wrong.
```

Do NOT proceed to the summary-writer. The summary-writer depends on the updated FRAMEWORK.md for cross-referencing vocabulary and thread states. Running it before FRAMEWORK.md is updated would produce inconsistent extractions.

</step>

<step name="spawn_summary_writer">

## Step 5: Spawn Summary-Writer (SECOND)

**Only after framework-keeper completes.** The summary-writer cross-references the updated FRAMEWORK.md for vocabulary, thread states, and concept status.

**Check SUMMARY.md template exists:**

```bash
[ -f "$CHAPTER_DIR/$PADDED-01-SUMMARY.md" ] && echo "SUMMARY.md found" || echo "SUMMARY.md not found"
```

If not found (Step 2 may have been skipped or failed):

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js summary extract --chapter $CHAPTER_NUMBER
```

**Spawn the summary-writer:**

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/summary-writer.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <draft_path>$CHAPTER_DIR/$PADDED-01-DRAFT.tex</draft_path>
    <plan_path>$CHAPTER_DIR/$PADDED-01-PLAN.md</plan_path>
    <summary_path>$CHAPTER_DIR/$PADDED-01-SUMMARY.md</summary_path>
    <framework_path>.planning/FRAMEWORK.md</framework_path>
  ",
  description="Fill SUMMARY.md for Chapter $CHAPTER_NUMBER"
)
```

**After the summary-writer completes, verify SUMMARY.md was filled:**

```bash
# Check frontmatter status
grep "status: complete" "$CHAPTER_DIR/$PADDED-01-SUMMARY.md" && echo "Status: complete" || echo "WARNING: Status not updated"

# Check for remaining placeholders
grep -c "\[To be filled" "$CHAPTER_DIR/$PADDED-01-SUMMARY.md" && echo "WARNING: Placeholders remaining" || echo "No placeholders found"
```

**If the summary-writer fails:**

```
The summary-writer did not complete successfully.
Type "retry" to spawn the summary-writer again, or describe what went wrong.

Note: The FRAMEWORK.md update from Step 4 is already complete. Retrying the summary-writer is safe.
```

The FRAMEWORK.md update from Step 4 is already done, so retrying the summary-writer does not risk losing framework-keeper work.

</step>

<step name="git_commit">

## Step 6: Git Commit

Commit the canonical document updates:

```bash
git add .planning/FRAMEWORK.md $CHAPTER_DIR/$PADDED-01-SUMMARY.md
git commit -m "docs(ch$PADDED): update canonical documents after review approval"
```

This direct git add/commit approach follows the Phase 2 decision (no phantom CLI commit wrapper).

</step>

<step name="verify_chain">

## Step 7: Verify Progressive Chain

Run the context assembly for the NEXT chapter to confirm the progressive chain works end-to-end:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js context --chapter $NEXT_CHAPTER_NUMBER
```

**Parse the JSON output and verify:**

1. **Summary count:** `summary_count` should be >= `$CHAPTER_NUMBER` (includes the newly filled summary). If the count does not include the new summary:

```
WARNING: Progressive chain may not include the new summary.
Expected summary_count >= $CHAPTER_NUMBER, got: $ACTUAL_COUNT

Check that SUMMARY.md exists at:
  $CHAPTER_DIR/$PADDED-01-SUMMARY.md

And that its filename matches the expected pattern (*-SUMMARY.md).
```

2. **Token estimate:** Check `token_estimate` against the 15K warning threshold.

If `token_estimate` exceeds 15K:

```
WARNING: Context bundle for Chapter $NEXT_CHAPTER_NUMBER is $TOKEN_ESTIMATE tokens.
This exceeds the 15K warning threshold.
Consider applying the FRAMEWORK.md archival protocol to compress older entries.
```

If `token_estimate` is within bounds: note the estimate for the completion report.

**Important:** A failed chain verification does NOT block the continuity update. The current chapter's FRAMEWORK.md and SUMMARY.md updates are valid regardless of whether the next chapter's context assembly works. Warn the author but do not roll back.

</step>

<step name="finalize">

## Step 8: Report

Report completion to the author with a summary of what was updated.

**Gather completion data:**

Read the FRAMEWORK.md changelog entry for this chapter to summarize what changed. Read the SUMMARY.md one-sentence summary. Note the token estimate from Step 7.

**Present completion report:**

```
Continuity update complete for Chapter $CHAPTER_NUMBER:

  FRAMEWORK.md: Updated ($FRAMEWORK_CHANGES_SUMMARY)
  SUMMARY.md: Filled (status: complete)
  FRAMEWORK.md.bak: Backup created
  Progressive chain: Verified ($SUMMARY_COUNT summaries available for Chapter $NEXT_CHAPTER_NUMBER)
  Token estimate: $TOKEN_ESTIMATE tokens

Next steps:
  - Plan the next chapter: /gtd:write-chapter $NEXT_CHAPTER_NUMBER
  - Or review the updates: read .planning/FRAMEWORK.md
```

</step>

</process>

<error_handling>

## Error Recovery

**Framework-keeper fails:**
- Report the error with any available details
- Offer retry: spawn the framework-keeper again with the same context
- Do NOT proceed to the summary-writer -- it depends on the updated FRAMEWORK.md
- If repeated failure: suggest checking that the DRAFT.tex file exists and FRAMEWORK.md is not corrupted

**Summary-writer fails:**
- Report the error with any available details
- Offer retry: spawn the summary-writer again (safe because FRAMEWORK.md already updated)
- If repeated failure: suggest checking that the SUMMARY.md template exists and the draft is readable

**SUMMARY.md does not exist (writing workflow did not scaffold it):**
- Run `gtd-tools.js summary extract --chapter N` to scaffold the template
- Then spawn the summary-writer as normal
- This is expected for chapters that were written before the summary CLI was available

**Next chapter context verification fails:**
- Warn the author but do NOT block -- the current chapter's continuity update is complete regardless
- Suggest checking SUMMARY.md path and filename pattern
- The context assembly command may fail if no subsequent chapter directory exists yet -- this is normal

**FRAMEWORK.md backup missing after CLI command:**
- The backup at `.planning/FRAMEWORK.md.bak` should be created by `gtd-tools.js framework update`
- If missing, warn but proceed -- the framework-keeper will create its own Write-based updates
- Suggest checking CLI output for errors

**Review gate not passed:**
- Error immediately: "Cannot run continuity loop on unapproved chapter."
- Direct author to `/gtd:review-chapter N`
- Do NOT proceed with extraction -- unreviewed content could corrupt FRAMEWORK.md

</error_handling>

<context_efficiency>

## Context Budget

This workflow stays at ~10% context by:

1. **Passing paths to agents, not content.** Each agent reads the draft independently in its own 200K window. The workflow never loads the chapter text.
2. **The workflow never reads the chapter draft.** It only reads metadata: SUMMARY.md frontmatter (a few lines), thesis progress output (JSON), thesis context output (JSON), and FRAMEWORK.md changelog (one line per chapter).
3. **No content accumulation between steps.** Each agent spawn is stateless. The framework-keeper and summary-writer do not share context -- they each start fresh and load what they need.
4. **Agents load context via CLI.** Each agent can run `gtd-tools.js context --chapter N` independently if needed. The workflow does not preload context for them.

**What NOT to do:**
- Do NOT read the chapter draft in the workflow -- pass the path to agents
- Do NOT read FRAMEWORK.md in full in the workflow -- only read the changelog section for the completion report
- Do NOT accumulate agent outputs in the workflow's memory -- each agent commits its own changes

</context_efficiency>

<what_not_to_do>

## Explicit Anti-Patterns

**Do NOT read the chapter draft in the workflow.** Pass the path to agents. Let agents read with their fresh 200K context windows. The draft is the largest document in the pipeline and loading it in the workflow wastes context.

**Do NOT run the summary-writer before the framework-keeper completes.** The ordering is critical: the summary-writer cross-references the updated FRAMEWORK.md for vocabulary, thread states, and concept status. Running them in parallel or reversed order would produce inconsistent extractions.

**Do NOT run this workflow on chapters that have not passed review.** Unreviewed content may contain term misuse, methodological errors, or citation problems that would corrupt FRAMEWORK.md and cascade into all subsequent chapters. The review gate is a non-negotiable prerequisite.

**Do NOT mark the chapter as "final" in this workflow.** That responsibility belongs to lifecycle management. This workflow updates the canonical record and fills the summary -- it does not change chapter status.

**Do NOT modify FRAMEWORK.md directly in the workflow.** The framework-keeper agent handles all extraction and modification. The workflow only verifies the results.

**Do NOT skip chain verification.** Even though it does not block the update, the verification in Step 7 catches integration issues early. A broken chain means the next chapter will write without the benefit of this chapter's summary.

**Do NOT retry the summary-writer if the framework-keeper failed.** The dependency is strict: framework-keeper first, summary-writer second. If the framework-keeper fails, fix that first.

**Do NOT use .md extension for draft paths.** All draft references use .tex: DRAFT.tex is the canonical draft format in the thesis pipeline.

</what_not_to_do>

<success_criteria>

## Verification

A successful continuity loop run produces:

- [ ] FRAMEWORK.md updated with entries from the chapter (changelog has real entry, not placeholder)
- [ ] FRAMEWORK.md.bak backup exists (created by CLI before modification)
- [ ] SUMMARY.md filled with structured content (status: complete, no placeholders)
- [ ] Progressive chain verified: `context --chapter N+1` includes the filled summary
- [ ] Token estimate reported and within bounds (or warning issued if exceeding 15K)
- [ ] All commits created (canonical document updates committed)
- [ ] Author informed of completion with next steps
- [ ] Framework-keeper ran BEFORE summary-writer (ordering constraint respected)
- [ ] No chapter draft text was loaded into the workflow context (only metadata)
- [ ] All terminology in author-facing messages is thesis-native

</success_criteria>
