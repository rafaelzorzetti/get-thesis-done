---
type: structure
thesis_title: "{{THESIS_TITLE}}"
level: "{{LEVEL}}"
total_chapters: "{{TOTAL_CHAPTERS}}"
last_updated: "{{DATE}}"
---

# Thesis Structure: {{THESIS_TITLE}}

## Thesis-Level Arc

<!-- The thesis-level arc captures the reader's transformation journey -- where they start
     intellectually and where they arrive by the final chapter. This arc is the spine of
     the thesis: every chapter must advance it. If a chapter doesn't move the reader from
     opening state toward closing state, question whether it belongs. Core argument movement
     describes the nature of the intellectual progression (e.g., from problem identification
     to proposed solution, from theory to empirical validation). Adapted from GWD's "Book-Level
     Arc" for academic thesis progression. -->

- **Opening state:** [Where the reader begins -- the problem, gap, or question the thesis addresses]
- **Closing state:** [Where the reader should arrive -- the contribution, answer, or framework the thesis provides]
- **Core argument movement:** [The intellectual arc -- what changes in the reader's understanding]

## Structure

<!-- The chapter contract: each chapter entry below is a binding contract between the author,
     the writing agent, and the reviewing agent. The writing agent receives exactly one chapter
     entry plus canonical context (framework + style guide + prior chapter summaries) and must
     produce a chapter that fulfills the contract. "Reserved / Do Not Touch" is the most critical
     field -- it prevents topic bleeding between chapters. The writing agent MUST NOT address
     reserved topics, even if they seem relevant. If a reserved topic must be mentioned, it
     should be only a brief forward reference ("this will be discussed in Chapter N").

     Theses use H3 for chapters (no Parts, unlike books). Target lengths are calibrated by
     thesis level: graduation ~2000-3000 words, master's ~3000-5000 words, PhD ~5000-8000 words. -->

### Chapter 01: {{CHAPTER_01_TITLE}}

- **Thesis:** [The single argument this chapter makes]
- **Key Points:**
  1. [Key point 1]
  2. [Key point 2]
  3. [Key point 3]
- **Connections:**
  - Builds on: Opening chapter -- establishes foundational context
  - Sets up: Ch 02 [what this enables]
- **Reserved / Do Not Touch:**
  - [Topic X -- belongs to Ch NN]
  - [Topic Y -- belongs to Ch NN]
- **Methodology:** [Research method this chapter employs, e.g., literature review, content analysis, case study]
- **Arc position:** [Where in the thesis argument this chapter sits, e.g., "Problem definition", "Theoretical grounding"]
- **Target length:** {{TARGET_LENGTH_RANGE}}

### Chapter 02: {{CHAPTER_02_TITLE}}

- **Thesis:** [The single argument this chapter makes]
- **Key Points:**
  1. [Key point 1]
  2. [Key point 2]
  3. [Key point 3]
- **Connections:**
  - Builds on: Ch 01 [what it uses from Ch 01]
  - Sets up: Ch 03 [what this enables]
- **Reserved / Do Not Touch:**
  - [Topic X -- belongs to Ch NN]
  - [Topic Y -- belongs to Ch NN]
- **Methodology:** [Research method this chapter employs]
- **Arc position:** [Where in the thesis argument this chapter sits]
- **Target length:** {{TARGET_LENGTH_RANGE}}

<!-- Add more chapter entries as needed. The new-thesis workflow will generate
     the correct number of chapter contracts based on the author's answers. -->

## Dependency Map

<!-- The dependency map determines safe writing order. Chapters with no dependencies
     can be written first. A chapter that depends on another requires that chapter's
     canonical summary in its writing context. This table is also used by the CLI to
     validate chapter ordering and prevent out-of-order writes. -->

| Chapter | Depends On | Why |
|---------|-----------|-----|
| Ch 01 | -- | Opening chapter, no dependencies |
| Ch 02 | Ch 01 | [Reason this chapter requires Ch 01 to be written first] |

## Arc Tracking

### Argumentative Arc

<!-- The argumentative arc tracks the logical progression of the thesis's central argument.
     Each chapter must advance the argument state -- introducing evidence, deepening claims,
     resolving tensions. If a chapter doesn't move the argument forward, question whether
     it belongs. The framework-keeper uses this table to update the Arguments section in
     FRAMEWORK.md after each chapter. -->

| Chapter | Argument State |
|---------|---------------|
| Ch 01 | [Argument state after this chapter, e.g., "Problem defined, gap identified"] |
| Ch 02 | [Argument state after this chapter, e.g., "Theoretical lens established"] |

### Methodological Arc

<!-- The methodological arc tracks which research methods are used in each chapter and
     ensures methodological consistency across the thesis. This is new compared to GWD
     (books don't have methodology) and critical for academic theses. The reviewer agent
     checks that methods used match those declared in the Methodology chapter and in
     FRAMEWORK.md's Methodological Commitments. -->

| Chapter | Method | Data/Sources | Outputs |
|---------|--------|-------------|---------|
| Ch 01 | [e.g., Literature review] | [e.g., Academic databases, key authors] | [e.g., Theoretical framework, gap analysis] |
| Ch 02 | [e.g., Content analysis] | [e.g., Primary sources, corpus] | [e.g., Categories, themes] |
