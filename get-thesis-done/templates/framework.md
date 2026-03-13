---
type: framework
thesis_title: "{{THESIS_TITLE}}"
level: "{{LEVEL}}"
language: "{{LANGUAGE}}"
version: 1
last_updated: "{{DATE}}"
updated_after: "Init"
---

<!-- TOKEN BUDGET: Target ~3,000 tokens when filled. Hard max 5,000 tokens.
     Portuguese BR tokenizes at ~1.3x English word count. Monitor with: word count * 1.3.
     If approaching 5K, archive resolved items per the archival protocol below. -->

<!-- ARCHIVAL PROTOCOL: When any continuity table exceeds 20 rows, move resolved
     or fully-established items to FRAMEWORK_ARCHIVE.md. FRAMEWORK_ARCHIVE.md is NOT
     injected into agent context -- only active, evolving items stay in this file. -->

# Theoretical Framework: {{THESIS_TITLE}}

## Thesis Statement

<!-- Every chapter must support, advance, or test this thesis. The thesis statement
     is the central research question or hypothesis expressed in 2-3 sentences. If a
     chapter cannot be connected back to this thesis, it does not belong in the work.
     The writing agent checks every section against this statement before finalizing. -->

[The central research question or hypothesis in 2-3 sentences. This is the single
claim that every chapter must support, advance, or test from a different angle.]

## Glossary

<!-- Every canonical term used in the thesis must have an entry here.
     CRITICAL: Every term MUST have a "NOT This" entry. Contrastive definitions
     prevent semantic drift -- the most common consistency failure in long-form
     AI-assisted writing. A term without a "NOT This" boundary is incomplete.
     Academic terms require precise definitions to prevent LLM drift across chapters.
     Add new terms as chapters are written. Use terse definitions to stay within
     token budget. -->

| Term | Definition | NOT This | First Used | Notes |
|------|-----------|----------|------------|-------|
| {{EXAMPLE_TERM_1}} | [Precise definition as used in this thesis] | [What this term does NOT mean in this context] | Ch 01 | [Usage notes] |
| {{EXAMPLE_TERM_2}} | [Precise definition as used in this thesis] | [What this term does NOT mean in this context] | Ch 01 | [Usage notes] |

## Research Positions

<!-- Positions are claims the thesis commits to and defends. Once a position is
     established, subsequent chapters must respect it unless explicitly superseded.
     Status values: Active (current), Superseded (replaced by newer position),
     Nuanced (refined but not replaced). These are the argumentative commitments
     that define the thesis's stance within its field. -->

| Position | Established In | Status |
|----------|---------------|--------|
| [Position statement 1] | Ch 01 | Active |

## Methodological Commitments

<!-- Research methodology, data sources, and analytical frameworks committed to.
     This section anchors the methodology chapter and prevents methodological
     inconsistency across the thesis. Every empirical claim must trace back to
     a commitment listed here. Changes to methodology require explicit documentation
     and justification. -->

| Commitment | Rationale | Scope |
|-----------|-----------|-------|
| [Methodological approach, e.g., "Qualitative content analysis"] | [Why this method suits the research question] | [Which chapters/data this applies to] |

## Continuity Map

### Key Concepts

<!-- Track every key concept or theoretical construct introduced in the thesis.
     Status: Recurring (appears across chapters), Established (definition is fixed),
     Resolved (fully explored -- candidate for archival). -->

| Concept | Introduced | Role | Last Referenced | Status |
|---------|-----------|------|-----------------|--------|
| [Concept name] | Ch 01 | [Role in the thesis argument] | Ch 01 | Recurring |

### Arguments (Progressive Thread)

<!-- Track the progressive argument chain across chapters. Each chapter's argument
     should build on prior ones. "Builds On" links to the chapter whose argument
     this one extends. Use "--" for the opening argument. -->

| Chapter | Argument | Builds On |
|---------|----------|-----------|
| Ch 01 | [Opening argument statement] | -- |

### Open Questions

<!-- Track questions, tensions, or theoretical threads that are introduced but not
     yet resolved. Once resolved, move to the relevant section or archive. Open
     questions drive the thesis forward and must be addressed before the conclusion. -->

| Question | Introduced | Expected Resolution |
|----------|-----------|-------------------|
| [Research sub-question or unresolved tension] | Ch 01 | Ch [N] |

## Changelog

<!-- Updated after each chapter is finalized. Track what was added or modified
     in the framework as a result of that chapter's content. This provides an audit
     trail of how the canonical reference evolved. -->

| Chapter | Date | Changes |
|---------|------|---------|
| Init | {{DATE}} | Initial framework created from new-thesis workflow |
