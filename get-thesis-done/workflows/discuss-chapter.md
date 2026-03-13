<purpose>
Capture the author's intent, tone, and key arguments for a specific chapter before planning. Produce a CONTEXT.md in the chapter directory that the chapter planner respects. You are a thinking partner -- the author is the visionary, you are the builder.
</purpose>

<downstream_awareness>
**CONTEXT.md feeds into the chapter planner agent**, which uses locked decisions to create the beat-sheet PLAN.md. Capture decisions clearly enough that the planner can act without asking the author again.

1. **planner** -- Reads chapter CONTEXT.md to know WHAT decisions are locked
   - "Open with a problem statement" -> planner MUST open with a problem statement
   - "Emphasize the theoretical framework" -> planner weights theoretical arguments
   - Deferred topics -> planner excludes these from the beat sheet

2. **writer** -- Indirectly benefits via the planner's beat sheet incorporating locked decisions

**Your job:** Capture decisions clearly enough that the planner can incorporate them into the beat sheet without asking the author again.

**Not your job:** Figure out HOW to structure the chapter. That is the planner's job.
</downstream_awareness>

<process>

<step name="initialize" priority="first">

## Step 1: Initialize

Receive chapter number from user (e.g., `/gtd:discuss-chapter 3`).

**Validate chapter exists:**

```bash
CONTEXT_META=$(node ~/.claude/get-thesis-done/bin/gtd-tools.js context --chapter $CHAPTER_NUMBER)
```

Parse the JSON output. Verify:
- `has_structure` is true -- if false, error: "No STRUCTURE.md found. Initialize your thesis project with /gtd:new-thesis first."

**Create chapter directory if needed:**

```bash
# Derive slug from STRUCTURE.md chapter title (lowercase, hyphenated, ASCII-safe)
mkdir -p .planning/chapters/${PADDED_CHAPTER}-${SLUG}
```

Where `PADDED_CHAPTER` is the zero-padded chapter number (e.g., `03`) and `SLUG` is derived from the chapter title in STRUCTURE.md.

**Check for existing CONTEXT.md:**

```bash
ls .planning/chapters/${PADDED_CHAPTER}-${SLUG}/*-CONTEXT.md 2>/dev/null
```

If CONTEXT.md already exists, ask the author:
- "Chapter N already has a CONTEXT.md. Would you like to view it, update it, or start fresh?"
- **View:** Display the existing CONTEXT.md, then offer update or keep
- **Update:** Load existing decisions as starting point, continue to discussion
- **Start fresh:** Proceed as if no CONTEXT.md exists

**Read only the chapter entry from STRUCTURE.md:**

Read `.planning/STRUCTURE.md` and extract ONLY the specific chapter section. Do NOT load full FRAMEWORK.md or STYLE_GUIDE.md -- the discussion is about this chapter's intent, not the full canonical context.

Extract from the chapter entry:
- Chapter title
- Thesis
- Key points
- Connections to other chapters
- Reserved / Do Not Touch topics
- Methodological arc position (if present)

</step>

<step name="present_contract">

## Step 2: Present Chapter Contract

Show the author their chapter contract from STRUCTURE.md:

```
## Chapter $CHAPTER_NUMBER: [Title]

**Thesis:** [thesis from STRUCTURE.md]

**Key Points:**
- [key point 1]
- [key point 2]
- [key point 3]

**Connections:**
- Builds on: [prior chapter references]
- Sets up: [future chapter references]

**Reserved (other chapters own these):**
- [reserved topic 1 -- Chapter N]
- [reserved topic 2 -- Chapter M]
```

Then ask: "What would you like to discuss about this chapter?"

This open question lets the author lead. They may want to discuss tone, specific arguments, evidence, or connections. Follow their lead.

</step>

<step name="discussion">

## Step 3: Deep Discussion

Adapt the discussion based on what the author raises. The gray areas for a chapter include:

- **Tone/register** for this specific chapter -- it may differ from the thesis's overall voice (e.g., more analytical, more argumentative, more descriptive)
- **Key arguments** and how to present them -- what evidence, what examples, what theoretical grounding to use
- **Methodological approach** for this chapter -- qualitative, quantitative, mixed methods, theoretical analysis, literature review approach
- **Key references** the author wants to feature -- specific .bib keys to emphasize, seminal works to cite, authors to engage with
- **Theoretical position** relative to the literature -- where the author stands, which school of thought, how to engage with counterarguments
- **Connection to research question** -- how this chapter advances the thesis argument, what gap it fills
- **Data/evidence sources** -- what evidence supports this chapter's claims, primary vs secondary sources, datasets, interviews, case studies
- **Evidence and examples** to include or avoid -- empirical data, case studies, quotations from sources
- **Connections** to prior/future chapters -- what to reference explicitly, what to leave for later
- **Emphasis** -- what gets deep treatment vs brief mention within the chapter
- **Opening/closing** -- how to enter and exit this chapter, the intellectual journey (thesis chapters can open with a problem statement, a research gap, or a theoretical puzzle)

**Questioning technique:**

Follow the questioning approach: ask 4 questions per area, then check satisfaction:
- "More about [area], or move to the next topic?"
- If more -> ask 4 more, check again
- After all areas the author raised: "Ready to create the chapter context?"

**Scope guard:**

If the author suggests ideas that belong to other chapters (per the Reserved / Do Not Touch list or connections), redirect:

```
"That sounds like it belongs in Chapter [N] -- [chapter title]. I'll note it as a deferred
idea. For now, let's focus on Chapter [M]."
```

Track deferred ideas internally -- they go into the CONTEXT.md deferred section.

**What NOT to ask:**
- Technical/implementation questions -- this is about the thesis's content and voice
- Questions about chapter structure -- that is the planner's job
- Questions already answered by STRUCTURE.md contract -- use the contract as given

</step>

<step name="write_context">

## Step 4: Write Chapter CONTEXT.md

Write to `.planning/chapters/${PADDED_CHAPTER}-${SLUG}/${PADDED_CHAPTER}-01-CONTEXT.md` using this format:

```markdown
# Chapter [N]: [Title] - Context

**Gathered:** [date]
**Status:** Ready for planning

<domain>
## Chapter Boundary

[Chapter thesis and scope from STRUCTURE.md. What this chapter covers and what it does not cover.
Include the thesis verbatim plus a scope statement derived from the key points and reserved topics.
Include methodological scope -- what methods or analytical approach this chapter employs.]

</domain>

<decisions>
## Chapter Decisions

### [Area 1 discussed -- e.g., Tone and Register]
- [Specific decision from discussion]
- [Another decision if applicable]

### [Area 2 discussed -- e.g., Key Arguments]
- [Specific decision from discussion]

### [Area 3 discussed -- e.g., Methodological Approach]
- [Specific decision from discussion]

### Key References
[If discussed: specific .bib keys or authors the author wants to cite or engage with]

### Claude's Discretion
[Areas where the author said "you decide" -- the planner has flexibility here]

</decisions>

<specifics>
## Specific Ideas

[References, examples, "I want it like X" moments from the discussion. Concrete instructions
the author gave that should appear in the beat sheet. Include specific .bib keys to cite if
the author mentioned them.]

</specifics>

<deferred>
## Deferred to Other Chapters

[Ideas redirected to other chapters during discussion. Captured here so they are not lost,
but explicitly out of scope for this chapter's plan.]

[If none: "None -- discussion stayed within chapter scope"]

</deferred>
```

**Population rules:**
- Only capture what the author explicitly discussed -- do NOT pre-populate with assumptions
- Decisions must be specific enough for the planner to act on without asking again
- Categories emerge from what was discussed, not from a predefined list
- If the author discussed tone, there is a Tone section. If not, there is no Tone section.
- If the author discussed key references, there is a Key References section. If not, there is none.

</step>

<step name="commit_and_report">

## Step 5: Commit and Report

Commit the CONTEXT.md:

```bash
git add .planning/chapters/${PADDED_CHAPTER}-${SLUG}/${PADDED_CHAPTER}-01-CONTEXT.md
git commit -m "docs(chapter-${CHAPTER_NUMBER}): capture chapter discussion context"
```

Report completion:

```
Chapter $CHAPTER_NUMBER context captured.

**Decisions locked:**
- [Key decision 1]
- [Key decision 2]

[If deferred ideas exist:]
**Noted for other chapters:**
- [Deferred idea] -- Chapter N

---

**Next steps:**
- Plan the chapter: /gtd:plan-chapter $CHAPTER_NUMBER
- Or write directly: /gtd:write-chapter $CHAPTER_NUMBER
```

</step>

</process>

<terminology>

## Thesis-Native Terminology

| Thesis Term | NOT This |
|-------------|----------|
| Chapter | Phase |
| Chapter context | Phase context |
| Chapter contract | Phase specification |
| Discussion | Requirements gathering |
| Decisions | Configuration |
| Beat sheet | Task list |
| Author | User |
| Thesis | Book |
| Advisor | Editor |

All communication with the author uses the left column. The right column terms never appear in author-facing messages.

</terminology>

<context_efficiency>

## Context Budget

This workflow runs in the main context (questioning is conversational). Keep context lean:

1. **Read only the chapter entry from STRUCTURE.md** -- never the full canonical bundle
2. **Do NOT load FRAMEWORK.md or STYLE_GUIDE.md** -- the discussion is about intent, not canonical terms
3. **Target ~25% context** -- the discussion itself is the main content, not loaded documents
4. **CONTEXT.md is lightweight** -- a few hundred words of captured decisions

</context_efficiency>

<scope_guardrail>

## Scope Guard

The chapter contract from STRUCTURE.md defines the chapter's boundary. Discussion clarifies HOW to approach what is scoped, not WHETHER to add more content.

**Allowed (clarifying approach):**
- "How should we open this chapter?" (approach choice)
- "Should we use empirical evidence or a theoretical argument here?" (evidence choice)
- "How much space should we dedicate to [key point]?" (emphasis choice)

**Not allowed (scope creep):**
- "Should we also cover [topic from another chapter]?" (other chapter's territory)
- "What about adding a new argument about X?" (if X is not in key points)
- "Maybe include a whole section on Y?" (structural addition -- planner's job)

**When the author suggests scope creep:**
"That idea would fit better in Chapter [N]. I'll note it so we don't lose it. For now, let's focus on Chapter [M]'s territory."

Capture deferred ideas in the CONTEXT.md deferred section.

</scope_guardrail>

<what_not_to_do>

## What NOT To Do

- Do NOT load full FRAMEWORK.md or STYLE_GUIDE.md in the discussion workflow -- only the chapter contract from STRUCTURE.md
- Do NOT ask technical/implementation questions -- ask about the thesis's content and voice for this chapter
- Do NOT expand scope beyond this chapter
- Do NOT pre-populate the CONTEXT.md with assumptions -- only capture what the author explicitly discussed
- Do NOT suggest chapter structure or section breakdown -- that is the planner's job
- Do NOT read other chapters' drafts or summaries -- the discussion is forward-looking, not retrospective

</what_not_to_do>
