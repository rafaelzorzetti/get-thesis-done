# Phase 3: Academic Review & Continuity - Research

**Researched:** 2026-03-13
**Domain:** Multi-agent review pipeline adaptation (GWD -> GTD), LaTeX/BibTeX citation validation, canonical document update loop
**Confidence:** HIGH

## Summary

Phase 3 adapts three existing GWD agents (reviewer, bible-keeper, summary-writer) and two GWD workflows (review-chapter, continuity-loop) for the GTD thesis context. The GWD originals are complete, well-structured, and already exist in the `agents/` and `get-writing-done/workflows/` directories. The adaptation follows the same pattern established in Phase 2 Plan 01 (planner + writer agent adaptation): replace book-native references with thesis-native ones, swap BIBLE.md for FRAMEWORK.md, OUTLINE.md for STRUCTURE.md, DRAFT.md for DRAFT.tex, gwd-tools.js for gtd-tools.js, and add thesis-specific review categories while removing book-specific ones.

The critical design decision in this phase is the review category transformation. GWD uses 6 categories (Term Consistency, Voice Pattern Matching, Voice Drift Detection, Inter-Chapter Continuity, Repetition Detection, Portuguese BR Quality). GTD requirements specify 4 categories (Citation Validity, Methodological Rigor, Argumentative Coherence, Formatting Norms). The categories are different in nature -- GWD reviews literary prose quality while GTD reviews academic rigor. Additionally, the continuity loop must update FRAMEWORK.md (not BIBLE.md) and the SUMMARY.md template already has a thesis-adapted format (7 sections instead of GWD's 8, with academic-specific sections like Methodological Contributions and Citations Used).

The CLI needs a `framework update` command (currently a placeholder returning "coming in Phase 3") to support the bible-keeper -> framework-keeper agent. This is the only new CLI feature needed. Everything else is agent/workflow adaptation.

**Primary recommendation:** Structure as 3 plans: (1) Agent adaptations (reviewer + framework-keeper + summary-writer), (2) Workflow + command creation (review-chapter + continuity-loop workflows, /gtd:review-chapter command), (3) CLI framework update command. This mirrors the Phase 2 pattern of agents first, workflows second, CLI third.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REVIEW-01 | `/gtd:review-chapter N` spawns reviewer agent with adversarial stance | GWD review-chapter workflow exists at `get-writing-done/workflows/review-chapter.md`; needs adaptation to thesis context (terminology, paths, review categories) |
| REVIEW-02 | Reviewer checks citation validity -- every `\cite{}` exists in .bib | `validate-citations` CLI command already exists in gtd-tools.js (Phase 2); reviewer agent must invoke it and incorporate results into Category 1 |
| REVIEW-03 | Reviewer checks methodological rigor -- consistency with methodology chapter | New category replacing GWD's Voice Pattern Matching and Voice Drift Detection; cross-references FRAMEWORK.md Methodological Commitments |
| REVIEW-04 | Reviewer checks argumentative coherence -- logical continuity across chapters | Maps to GWD Category 4 (Inter-Chapter Continuity) with thesis-specific adaptations; uses FRAMEWORK.md positions, continuity map, and prior summaries |
| REVIEW-05 | Reviewer checks formatting norms -- ABNT/APA compliance, LaTeX structure | New category replacing GWD's Portuguese BR Quality; checks LaTeX commands, abnTeX2 structure, ABNT/APA-specific formatting |
| REVIEW-06 | Review supports up to 2 revision cycles before forcing author decision | Already implemented in GWD review-chapter workflow; direct adaptation |
| REVIEW-07 | Approved chapters trigger continuity loop -- framework-keeper updates FRAMEWORK.md, summary-writer fills SUMMARY.md | GWD continuity-loop workflow exists at `get-writing-done/workflows/continuity-loop.md`; needs BIBLE.md -> FRAMEWORK.md swap and thesis-adapted extraction |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | 18+ | CLI commands (fs, path, child_process) | Zero runtime dependencies -- project constraint |
| gtd-tools.js | current | CLI utility (validate-citations, context, summary, framework) | Already exists; needs framework update command |
| Claude Code Task() | n/a | Agent spawning for reviewer, framework-keeper, summary-writer | Same pattern as Phase 2 write-chapter workflow |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| git | any | Commit review artifacts and canonical document updates | Direct git add/commit (no phantom CLI wrapper -- Phase 2 decision) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct git add/commit | gtd-tools.js commit wrapper | Phase 2 decided against CLI commit wrapper; direct git is simpler |
| 4 review categories | 6 GWD categories | GWD's 6 are book-specific; thesis needs different decomposition |

## Architecture Patterns

### Recommended Project Structure

```
agents/
  reviewer.md              # Adapted from GWD (6 book categories -> 4 thesis categories)
  framework-keeper.md      # Adapted from agents/bible-keeper.md (BIBLE->FRAMEWORK)
  summary-writer.md        # Adapted from GWD (8 sections -> 7 thesis sections)
get-thesis-done/
  workflows/
    review-chapter.md      # Adapted from get-writing-done/workflows/review-chapter.md
    continuity-loop.md     # Adapted from get-writing-done/workflows/continuity-loop.md
  bin/
    gtd-tools.js           # Add framework update command
commands/gtd/
  review-chapter.md        # Adapted from commands/gwd/review-chapter.md
```

### Pattern 1: Agent Adaptation (GWD -> GTD)

**What:** Rewrite GWD agents with thesis-native terminology, paths, and domain logic while preserving the proven multi-agent architecture.

**When to use:** For all three agents in this phase.

**Proven in Phase 2:** Plan 02-01 established this pattern for planner.md and writer.md. Key transformations:

```
BIBLE.md         -> FRAMEWORK.md
OUTLINE.md       -> STRUCTURE.md
DRAFT.md         -> DRAFT.tex
gwd-tools.js     -> gtd-tools.js
get-writing-done -> get-thesis-done
/gwd:*           -> /gtd:*
has_bible        -> has_framework
has_outline      -> has_structure
book             -> thesis
author (literary)-> researcher (academic)
```

### Pattern 2: Orchestrator-Agent Context Isolation

**What:** Workflow orchestrators pass paths to agents, never content. Each agent starts with a fresh 200K context window and loads what it needs via `gtd-tools.js context --chapter N`.

**When to use:** Both review-chapter and continuity-loop workflows.

**Example (from GWD review-chapter, adapted):**
```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/reviewer.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <draft_path>$CHAPTER_DIR/$PADDED-01-DRAFT.tex</draft_path>
    <plan_path>$CHAPTER_DIR/$PADDED-01-PLAN.md</plan_path>
    <output_path>$CHAPTER_DIR/$PADDED-01-REVIEW.md</output_path>
  ",
  description="Review Chapter $CHAPTER_NUMBER"
)
```

### Pattern 3: Sequential Agent Dependency in Continuity Loop

**What:** Framework-keeper runs FIRST, summary-writer runs SECOND. The summary-writer depends on the updated FRAMEWORK.md for cross-referencing vocabulary, thread states, and concept status. Running them in parallel or reversed order produces inconsistent extractions.

**When to use:** Continuity loop workflow.

### Pattern 4: Review-Then-Continuity Chaining

**What:** The `/gtd:review-chapter N` command chains two workflows: review-chapter (review + optional revision) followed by continuity-loop (framework update + summary fill) on approval. The GWD command already does this -- the GTD adaptation preserves this chaining.

**Source:** `commands/gwd/review-chapter.md` shows the chaining pattern.

### Anti-Patterns to Avoid

- **Loading chapter draft in workflow context:** Pass paths, not content. The draft is the largest document in the pipeline.
- **Running continuity loop on unreviewed chapters:** Unreviewed content may contain term misuse, methodological inconsistencies, or citation errors that would corrupt FRAMEWORK.md and cascade.
- **Creating a separate revision agent:** Reuse the writer.md in Wave 2 mode with `<revision>` block (Phase 2 established this).
- **Running framework-keeper and summary-writer in parallel:** Strict ordering -- framework-keeper first, summary-writer second.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Citation validation | Custom grep in reviewer | `gtd-tools.js validate-citations --chapter N` | Already handles all biblatex citation variants (cite, textcite, autocite, parencite, footcite, cites, starred, optional args) |
| Context assembly | Manual file reads | `gtd-tools.js context --chapter N` | Assembles FRAMEWORK.md + STYLE_GUIDE.md + chapter structure + prior summaries with token estimation |
| Summary template creation | Manual scaffold | `gtd-tools.js summary extract --chapter N` | Write-once protection (never overwrites existing), thesis-adapted 7-section format |
| LaTeX special character detection | Ad-hoc regex | `gtd-tools.js sanitize --chapter N` | Protected-zone approach preserves commands/math/comments |
| Review revision tracking | Custom state machine | Workflow variables (revision_count, max_revisions, current_draft_path) | GWD pattern proven to work |

**Key insight:** Phase 2 built substantial CLI infrastructure. The reviewer agent should USE these tools rather than reimplementing citation validation, sanitization, or context assembly.

## Common Pitfalls

### Pitfall 1: GWD Stale References in Adapted Agents

**What goes wrong:** After adaptation, agents still contain references to BIBLE.md, OUTLINE.md, gwd-tools.js, get-writing-done, or DRAFT.md.

**Why it happens:** GWD agents are long (reviewer.md is 717 lines, bible-keeper.md is 368 lines, summary-writer.md is 453 lines). Easy to miss references during bulk find-replace.

**How to avoid:** After each adaptation, run grep verification (same as Phase 2 Plan 01 did):
```bash
grep -i "bible\|outline\|gwd-tools\|get-writing-done\|DRAFT\.md\|/gwd:" agents/reviewer.md
# Should return 0 matches (or only in terminology table "NOT This" column)
```

**Warning signs:** Agent spawns fail with "BIBLE.md not found" or "gwd-tools.js: command not found".

### Pitfall 2: Review Category Mismatch Between Agent and Workflow

**What goes wrong:** The reviewer agent defines 4 categories, but the workflow still references 6 GWD category names or expects score format from 6-category review.

**Why it happens:** The reviewer agent and review-chapter workflow are adapted independently but must agree on the review output schema.

**How to avoid:** Define the REVIEW.md frontmatter schema FIRST, then ensure both the reviewer agent and the review-chapter workflow use the same schema. The critical fields are: `status`, `score`, `failed_checks` (with category names matching the agent's 4 categories).

**Warning signs:** Workflow fails to parse REVIEW.md, or presents findings with wrong category names.

### Pitfall 3: DRAFT.tex vs DRAFT.md Path Confusion

**What goes wrong:** GWD workflows reference `DRAFT.md` throughout. GTD uses `DRAFT.tex` (LaTeX output from Phase 2 writer). If the review workflow passes `.md` paths, the reviewer looks for a nonexistent file.

**Why it happens:** Phase 2 changed the writer output to `.tex` but the review/continuity workflows are adapted from GWD which uses `.md`.

**How to avoid:** Every path reference in the adapted workflows and agents must use `.tex` extension for draft files. Revision drafts should also use `.tex`: `DRAFT-r1.tex`, `DRAFT-r2.tex`.

**Warning signs:** "Draft not found" errors when the file actually exists (with wrong extension).

### Pitfall 4: Summary Template Section Mismatch

**What goes wrong:** The summary-writer agent (adapted from GWD) tries to fill 8 GWD sections, but the thesis SUMMARY.md template (created by `gtd-tools.js summary extract`) has 7 thesis-specific sections.

**Why it happens:** GWD summary has: One-Sentence Summary, Claims Made, Metaphors Active, Constraints Established, Threads Opened, Threads Closed, Key Vocabulary, Emotional Arc. GTD template has: Key Arguments Made, Terms Introduced or Developed, Threads Advanced, Methodological Contributions, Citations Used, Connections, Open Threads.

**How to avoid:** The adapted summary-writer must use the thesis template sections, not the GWD sections. The mapping:
- Claims Made -> Key Arguments Made
- Key Vocabulary -> Terms Introduced or Developed
- Threads Opened/Closed -> Threads Advanced + Open Threads
- (new) Methodological Contributions
- (new) Citations Used
- (new) Connections (Built on / Sets up)
- (removed) Metaphors Active, Constraints Established, Emotional Arc

### Pitfall 5: Framework Update CLI Missing Backup

**What goes wrong:** The framework-keeper agent modifies FRAMEWORK.md without creating a backup first, risking data loss.

**Why it happens:** GWD bible-keeper relies on `gwd-tools.js bible update` to create a backup. The equivalent `gtd-tools.js framework update` does not exist yet.

**How to avoid:** Build the `framework update` CLI command BEFORE the framework-keeper agent expects it. The command should: (1) create backup at FRAMEWORK.md.bak, (2) update frontmatter (updated_after, last_updated), (3) append placeholder changelog row.

### Pitfall 6: Revision Draft Extension (.tex not .md)

**What goes wrong:** GWD review workflow creates revision drafts as `DRAFT-r1.md`, `DRAFT-r2.md`. In GTD these must be `DRAFT-r1.tex`, `DRAFT-r2.tex` because the writer produces LaTeX.

**Why it happens:** Direct copy from GWD workflow without updating extensions.

**How to avoid:** Search for every `.md` reference in the adapted review-chapter workflow and determine if it should be `.tex`.

## Code Examples

### Existing Citation Validation (from gtd-tools.js)

The `validateCitations()` function already handles all biblatex citation variants:

```javascript
// Source: get-thesis-done/bin/gtd-tools.js line 841-863
const citePattern = /\\(?:[Tt]ext|[Aa]uto|[Pp]aren|[Ff]oot)?[Cc]ite[sp]?\*?(?:\[[^\]]*\])*\{([^}]+)\}/g;
```

The reviewer agent should invoke this via CLI rather than reimplementing:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js validate-citations --chapter $CHAPTER_NUMBER
```

### Framework Update CLI Pattern (to build)

Based on the existing `cmdSummaryExtract` pattern and GWD's `bible update` behavior:

```javascript
function cmdFrameworkUpdate(cwd, chapter, raw) {
  // 1. Create backup
  const fwPath = path.join(cwd, '.planning', 'FRAMEWORK.md');
  const bakPath = path.join(cwd, '.planning', 'FRAMEWORK.md.bak');
  fs.copyFileSync(fwPath, bakPath);

  // 2. Update frontmatter
  const content = fs.readFileSync(fwPath, 'utf-8');
  const fm = extractFrontmatter(content);
  fm.updated_after = 'Ch ' + String(parseInt(chapter)).padStart(2, '0');
  fm.last_updated = new Date().toISOString().split('T')[0];
  const updated = spliceFrontmatter(content, fm);

  // 3. Append placeholder changelog row
  // ... (append to changelog table)

  fs.writeFileSync(fwPath, updated, 'utf-8');
}
```

### Agent Spawn Pattern (from write-chapter.md workflow)

```
Task(
  subagent_type="general-purpose",
  prompt="
    First, read ~/.claude/agents/reviewer.md for your role and instructions.

    <chapter>$CHAPTER_NUMBER</chapter>
    <chapter_dir>$CHAPTER_DIR</chapter_dir>
    <draft_path>$CHAPTER_DIR/$PADDED-01-DRAFT.tex</draft_path>
    <plan_path>$CHAPTER_DIR/$PADDED-01-PLAN.md</plan_path>
    <output_path>$CHAPTER_DIR/$PADDED-01-REVIEW.md</output_path>
  ",
  description="Review Chapter $CHAPTER_NUMBER"
)
```

### Review-Continuity Chaining Pattern (from GWD command)

The `/gtd:review-chapter` command chains two workflows:

```markdown
1. Execute review-chapter workflow end-to-end
2. After review finalization, check status:
   - If "approved": automatically execute continuity-loop workflow
   - If NOT approved: report status, let author decide
3. On combined completion, report all files produced
```

### GWD Review YAML Frontmatter (adapted for thesis)

```yaml
---
type: chapter-review
chapter: NN
draft_path: "NN-01-DRAFT.tex"
reviewed: YYYY-MM-DDTHH:MM:SSZ
status: passed | needs_revision | failed
score: N/M checks passed
re_review: false
previous_score: null
failed_checks:
  - category: "citation_validity"
    item: "Specific finding"
    evidence: "Quote from text"
    fix: "Suggested fix"
---
```

## State of the Art

| Old Approach (GWD) | Current Approach (GTD) | When Changed | Impact |
|---------------------|----------------------|--------------|--------|
| 6 book review categories | 4 thesis review categories | Phase 3 | Entirely different check decomposition |
| BIBLE.md as canonical record | FRAMEWORK.md as canonical record | Phase 1 | All bible-keeper refs become framework-keeper |
| DRAFT.md (Markdown) | DRAFT.tex (LaTeX) | Phase 2 | All path refs in review/continuity must use .tex |
| 8-section summary (literary) | 7-section summary (academic) | Phase 2 | Summary-writer must match thesis template |
| gwd-tools.js CLI | gtd-tools.js CLI | Phase 1 | All CLI refs in agents/workflows must use gtd-tools |
| `gwd-tools.js bible update` | `gtd-tools.js framework update` | Phase 3 (new) | Must build this CLI command |
| `gwd-tools.js commit` wrapper | Direct `git add`/`git commit` | Phase 2 | Workflows use direct git, not CLI wrapper |

## Review Category Transformation

This is the core design work of Phase 3. The mapping from GWD's 6 literary categories to GTD's 4 academic categories:

### GTD Category 1: Citation Validity (REVIEW-02)

**What it checks:**
- Every key argument has a `\cite{}` or `\textcite{}`
- Every `\cite{}` key exists in references.bib (use `validate-citations` CLI)
- Citation usage is appropriate (not just piled at end of paragraph)
- Citation commands match intent: `\textcite{}` for narrative, `\cite{}` for parenthetical, `\autocite{}` for ABNT auto-formatting

**Source data:** DRAFT.tex content, references.bib, PLAN.md planned_citations

**Maps from GWD:** No direct equivalent -- this is thesis-specific.

### GTD Category 2: Methodological Rigor (REVIEW-03)

**What it checks:**
- Methods described in this chapter are consistent with FRAMEWORK.md Methodological Commitments
- Claims are supported by appropriate evidence type (empirical claims need data, theoretical claims need literature)
- Analytical approach matches STRUCTURE.md Methodological Arc position for this chapter
- Research limitations are acknowledged where relevant (not weak hedging, but honest scope declaration)

**Source data:** FRAMEWORK.md Methodological Commitments, STRUCTURE.md Methodological Arc, DRAFT.tex, PLAN.md methodology fields

**Maps from GWD:** Partially maps to Category 1 (Term Consistency) in the sense of checking canonical definitions, but is fundamentally different in nature.

### GTD Category 3: Argumentative Coherence (REVIEW-04)

**What it checks:**
- Chapter thesis stated and supported across sections
- Arguments build logically (no gaps, no contradictions within the chapter)
- FRAMEWORK.md Research Positions are respected (no contradictions with established positions)
- Open Questions from FRAMEWORK.md are addressed if this chapter was expected to resolve them
- Progressive argument thread connects to prior chapters (via summaries)
- Reserved topics from STRUCTURE.md are not developed in this chapter

**Source data:** FRAMEWORK.md (Positions, Continuity Map, Open Questions), STRUCTURE.md (chapter contract, reserved topics), prior summaries, PLAN.md

**Maps from GWD:** Primarily maps to Category 4 (Inter-Chapter Continuity) with elements of Category 5 (Repetition Detection).

### GTD Category 4: Formatting Norms Compliance (REVIEW-05)

**What it checks:**
- ABNT/APA formatting rules are followed (based on thesis.json norm setting)
- LaTeX structure is valid: `\chapter{}`, `\section{}`, `\subsection{}` hierarchy
- Labels use consistent convention: `\label{chap:slug}`, `\label{sec:slug}`
- Table and figure environments are properly formed
- Cross-references use `\ref{}` correctly
- No raw special characters in prose (& % $ # _ should be escaped outside commands)
- Paragraph structure appropriate for academic writing
- Section lengths approximately match PLAN.md targets

**Source data:** DRAFT.tex, thesis.json (for norm), PLAN.md (for length targets)

**Maps from GWD:** Category 2 (Voice Pattern Matching), Category 3 (Voice Drift Detection), Category 6 (Portuguese BR Quality) are all replaced by this single but comprehensive formatting category.

### What GTD Removes from GWD

| GWD Category | Why Removed |
|-------------|-------------|
| Voice Pattern Matching (banned connectors, opening/closing type, assistant tone) | Thesis writing uses formal academic register, not literary voice. Anti-patterns are handled by the writer agent's persona enforcement. |
| Voice Drift Detection (calibration passages, metrics) | Academic writing does not calibrate against "literary voice passages." Consistency is about methodological and argumentative coherence, not prose rhythm. |
| Repetition Detection (cross-chapter, verbal tics) | Some repetition is expected in academic writing (technical terms SHOULD repeat). Argument repetition is caught by Category 3 (Argumentative Coherence). |
| Portuguese BR Quality (anglicisms, register, gerunds) | Language quality is the writer agent's responsibility (persona enforcement). The reviewer focuses on academic rigor, not prose polish. |

## Framework-Keeper Adaptation

The bible-keeper -> framework-keeper adaptation requires these changes:

### GWD Bible-Keeper 8-Step Extraction -> GTD Framework-Keeper Extraction

| GWD Step | GTD Equivalent | Notes |
|----------|---------------|-------|
| 1. Glossary | Glossary | Same concept, thesis terms instead of theological terms |
| 2. Positions | Research Positions | Same structure, academic positions instead of theological |
| 3. Continuity Map - Figures | Continuity Map - Key Concepts | Thesis tracks concepts, not character figures |
| 4. Continuity Map - Metaphors and Symbols | (removed or simplified) | Academic theses rarely track metaphors systematically |
| 5. Continuity Map - Arguments | Continuity Map - Arguments | Same progressive thread pattern |
| 6. Continuity Map - Open Threads | Continuity Map - Open Questions | Same concept, thesis terminology |
| 7. Recurring Elements Registry | (removed) | Academic theses do not track recurring literary elements |
| 8. Changelog | Changelog | Same concept |

### Framework-Keeper Adds

- **Methodological Commitments update:** Check if the chapter introduced, refined, or extended any methodological approaches. Update the Methodological Commitments table if needed.

### Framework-Keeper Keeps

- Table safety rules (column counting before row insertion)
- Token budget awareness (3K target, 5K hard max, 1.3x Portuguese tokenization factor)
- Append-only operation (entries are never deleted, only marked Superseded/Resolved)
- CLI backup step before modification
- Anti-patterns: never rewrite from scratch, never load prior summaries, never run before review gate

## Summary-Writer Adaptation

### GWD 8-Section -> GTD 7-Section Mapping

| GWD Section | GTD Section | Notes |
|------------|-------------|-------|
| One-Sentence Summary | (merged into Key Arguments Made as first entry) | Claims over descriptions rule still applies |
| Claims Made | Key Arguments Made | Same structured extraction protocol |
| Metaphors Active | (removed) | Not relevant for academic theses |
| Constraints Established | (embedded in Connections "Sets up") | What future chapters must respect |
| Threads Opened | Open Threads | Same concept |
| Threads Closed | Threads Advanced | Broadened to include both advancement and closure |
| Key Vocabulary | Terms Introduced or Developed | Same FRAMEWORK.md cross-referencing |
| Emotional Arc | (removed) | Not relevant for academic writing |
| (new) | Methodological Contributions | Thesis-specific: methods applied and outputs |
| (new) | Citations Used | Thesis-specific: key references cited |
| (new) | Connections (Built on / Sets up) | Thesis-specific: explicit dependency chain |

### Critical Preservation

- Anti-narrative rule: structured extraction only, no narrative prose
- Placeholder removal protocol: verify no `[To be filled` markers remain
- Frontmatter update: status draft -> complete, word_count from approved draft
- Cross-referencing against PLAN.md (planned vs actual arguments)
- Cross-referencing against FRAMEWORK.md (canonical term usage)

## CLI Extension: Framework Update Command

### What to Build

A `framework update --chapter N` command in gtd-tools.js that:

1. Creates backup at `.planning/FRAMEWORK.md.bak`
2. Updates frontmatter: `updated_after: Ch NN`, `last_updated: YYYY-MM-DD`
3. Appends placeholder changelog row: `| Ch NN | YYYY-MM-DD | [Updated after chapter completion -- review needed] |`

### Integration Point

The existing CLI router (switch/case in `main()`) has a placeholder for this:

```javascript
case 'framework': {
  error('Framework update command coming in Phase 3. Use context --chapter N for now.');
  break;
}
```

This placeholder must be replaced with the actual implementation.

### Design Constraints

- Zero runtime dependencies (Node.js built-ins only)
- Same YAML frontmatter handling pattern as existing commands (extractFrontmatter/spliceFrontmatter)
- Write-once backup: only create .bak if it does not already exist for this session
- Table structure safety: count columns before appending changelog row

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual verification via grep + file existence checks |
| Config file | none -- verification embedded in plan execution |
| Quick run command | `grep -c "FRAMEWORK\|STRUCTURE\|gtd-tools\|DRAFT\.tex" agents/reviewer.md` |
| Full suite command | Manual verification checklist per plan |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REVIEW-01 | /gtd:review-chapter command spawns reviewer | smoke | `[ -f commands/gtd/review-chapter.md ] && echo PASS` | Wave 0 |
| REVIEW-02 | Reviewer checks citation validity | unit | `grep -c "validate-citations" agents/reviewer.md` | Wave 0 |
| REVIEW-03 | Reviewer checks methodological rigor | unit | `grep -c "Methodological" agents/reviewer.md` | Wave 0 |
| REVIEW-04 | Reviewer checks argumentative coherence | unit | `grep -c "FRAMEWORK\|position\|continuity" agents/reviewer.md` | Wave 0 |
| REVIEW-05 | Reviewer checks formatting norms | unit | `grep -c "ABNT\|APA\|formatting" agents/reviewer.md` | Wave 0 |
| REVIEW-06 | 2 revision cycle cap enforced | unit | `grep -c "max_revisions\|revision_count" get-thesis-done/workflows/review-chapter.md` | Wave 0 |
| REVIEW-07 | Approved triggers continuity loop | smoke | `[ -f get-thesis-done/workflows/continuity-loop.md ] && echo PASS` | Wave 0 |

### Sampling Rate

- **Per task commit:** Grep-based verification (stale GWD refs, required terms present)
- **Per wave merge:** Full checklist verification
- **Phase gate:** All 7 REVIEW-* requirements verified

### Wave 0 Gaps

- [ ] `agents/reviewer.md` -- needs complete rewrite (4 thesis categories)
- [ ] `agents/framework-keeper.md` -- does not exist yet (adapted from bible-keeper.md)
- [ ] `agents/summary-writer.md` -- needs thesis-section adaptation
- [ ] `get-thesis-done/workflows/review-chapter.md` -- does not exist yet
- [ ] `get-thesis-done/workflows/continuity-loop.md` -- does not exist yet
- [ ] `commands/gtd/review-chapter.md` -- does not exist yet
- [ ] `gtd-tools.js framework update` -- placeholder only, needs implementation

## Open Questions

1. **Should the reviewer invoke `validate-citations` CLI or implement its own check?**
   - What we know: `validate-citations` CLI already exists and handles all biblatex variants
   - What's unclear: Whether the reviewer should call CLI (faster, DRY) or inline the logic (more detail in review output)
   - Recommendation: Call CLI for the pass/fail result, but also do a qualitative check (are citations placed at substantive claims, not just piled at paragraph ends?)

2. **Should formatting norms check be norm-aware (ABNT vs APA)?**
   - What we know: thesis.json stores the norm setting. ABNT and APA have different formatting requirements.
   - What's unclear: How much norm-specific checking the reviewer should do vs generic LaTeX structure checking
   - Recommendation: Check thesis.json for norm, apply norm-specific rules for citation style format, but keep most LaTeX structure checks generic

3. **What happens to REVIEW.md scoring with only 4 categories?**
   - What we know: GWD scores N/M across ~20+ subchecks in 6 categories. GTD has 4 categories.
   - What's unclear: How many subchecks per GTD category, and whether the score format should change
   - Recommendation: Each GTD category should have 3-5 specific subchecks. Score format stays N/M. Total should be roughly 15-20 subchecks across 4 categories for meaningful granularity.

## Sources

### Primary (HIGH confidence)

- `agents/reviewer.md` -- Full GWD reviewer agent (717 lines, 6 categories, re-verification mode)
- `agents/bible-keeper.md` -- Full GWD bible-keeper agent (368 lines, 8-step extraction)
- `agents/summary-writer.md` -- Full GWD summary-writer agent (453 lines, 8-section extraction)
- `get-writing-done/workflows/review-chapter.md` -- Full GWD review workflow (518 lines)
- `get-writing-done/workflows/continuity-loop.md` -- Full GWD continuity loop workflow (361 lines)
- `commands/gwd/review-chapter.md` -- GWD review command with continuity chaining
- `get-thesis-done/bin/gtd-tools.js` -- Current CLI with validate-citations, summary extract, framework placeholder
- `agents/planner.md`, `agents/writer.md` -- Phase 2 adapted agents (precedent for adaptation pattern)
- `get-thesis-done/workflows/write-chapter.md` -- Phase 2 workflow (precedent for GTD workflow format)
- `.planning/REQUIREMENTS.md` -- REVIEW-01 through REVIEW-07 definitions
- `.planning/STATE.md` -- Key decisions and Phase 2 completion status
- `get-thesis-done/templates/framework.md` -- FRAMEWORK.md template structure (sections to update)

### Secondary (MEDIUM confidence)

- `.planning/phases/02-writing-pipeline-compilation/02-01-SUMMARY.md` -- Phase 2 adaptation pattern documentation
- `.planning/PROJECT.md` -- Project architecture and agent roles

### Tertiary (LOW confidence)

- None -- all findings are based on direct source code analysis, no web search needed for this domain.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already exist or have clear precedent in codebase
- Architecture: HIGH -- direct adaptation of proven GWD patterns with Phase 2 precedent
- Pitfalls: HIGH -- identified from actual code analysis and Phase 2 experience
- Review categories: HIGH -- requirements are explicit; transformation from GWD is well-defined

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain -- all source material is in-repo)
