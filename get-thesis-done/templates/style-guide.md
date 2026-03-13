---
type: style_guide
thesis_title: "{{THESIS_TITLE}}"
level: "{{LEVEL}}"
language: "{{LANGUAGE}}"
citation_style: "{{CITATION_STYLE}}"
version: 1
last_updated: "{{DATE}}"
---

# Style Guide: {{THESIS_TITLE}}

## Voice Profile

<!-- Voice Profile defines the authorial identity for academic writing. Each field captures
     a dimension of voice that the writing agent must maintain consistently across all chapters.
     Register sets formality level, POV determines narrative distance, Tone controls emotional
     coloring, and Influences provide calibration references the agent can study. Adapted for
     academic register: formal without being impenetrable. -->

- **Register:** Academic essay -- formal without being impenetrable
- **POV:** Third person for analysis, first person plural for positioning ("we argue", "our analysis shows")
- **Tone:** [e.g., Rigorous, analytical, measured -- never polemical or dismissive]
- **Influences:** [e.g., key authors whose academic prose style the thesis emulates]

## Academic Writing Patterns (Do This)

<!-- Academic writing patterns are the voice fingerprints the writer agent must emulate.
     Each pattern type shows a structural move used in strong academic prose. The blockquote
     examples are gold-standard references -- the agent should produce sentences that feel
     like these. More patterns can be added as the author's voice crystallizes across chapters. -->

### Claim-Evidence-Analysis structure

> State the claim, present the evidence, then analyze what the evidence demonstrates.

Every argumentative paragraph follows this sequence. The claim advances the thesis, the evidence
grounds it empirically or theoretically, and the analysis connects evidence back to the claim.
Never present evidence without analysis.

### Hedging for precision

> "The data suggest..." not "The data prove..."
> "This finding is consistent with..." not "This finding confirms..."

Academic precision requires appropriate hedging. Distinguish between strong claims (supported by
multiple converging sources) and tentative claims (based on limited evidence). Hedging is not
weakness -- it is intellectual honesty.

### Topic sentences that advance the argument

> Each paragraph opens with a sentence that both connects to the previous paragraph and advances
> the chapter's argument by one step.

Topic sentences are the backbone of academic prose. A reader should be able to read only the
topic sentences of a chapter and follow the argument.

### Signposting transitions between sections

> "Having established X, we now turn to Y, which..." / "The preceding analysis raises a
> question that the following section addresses..."

Academic readers need explicit signposting between sections. Unlike literary prose, where
transitions can be implicit, academic writing benefits from explicit logical connectors at
the section level.

## Anti-Patterns (Never Do This)

<!-- Anti-patterns are as important as patterns. Each must have a concrete BAD example showing
     exactly what to avoid, a GOOD alternative showing the correct approach, and a WHY
     explanation justifying the rule. The writing agent checks output against these before
     finalizing any chapter section. -->

### AI assistant tone (CRITICAL)

- **BAD:** "It's important to note that..." / "E importante notar que..."
- **BAD:** "In conclusion, we can see that..." / "Em conclusao, podemos ver que..."
- **BAD:** "Let's explore this concept..." / "Vamos explorar esse conceito..."
- **BAD:** "This is a fascinating topic..." / "Este e um tema fascinante..."
- **BAD:** Hedging every claim with "perhaps" or "it could be argued that"
- **GOOD:** Direct academic voice with conviction grounded in evidence. State the finding, cite the source, analyze the implication.
- **WHY:** LLM default RLHF patterns contaminate academic voice. These phrases are the fingerprint of machine-generated text. Actively suppress every instance. The thesis has an author -- the assistant must channel their voice, not overlay its own.

### Unsupported claims

- **BAD:** "Research shows that X is true." (no citation)
- **BAD:** "It is widely known that..." (appeals to vague authority)
- **GOOD:** "Silva (2023) demonstrates that X, based on analysis of Y (p. 45)."
- **WHY:** Every factual or interpretive claim in academic writing MUST have a `\cite{}` or `\textcite{}`. Claims without citations are the most common academic integrity failure. The writer agent must never generate a claim without a corresponding reference from the user's .bib file.

### Informal register bleeding

- **BAD:** "This theory is basically saying that..."
- **BAD:** "The thing is, this approach doesn't really work."
- **GOOD:** "This theory posits that..." / "This approach presents significant limitations."
- **WHY:** Maintaining consistent academic register throughout the thesis is essential. Informal language undermines the authority of the argument and is flagged in academic review.

### Listing and enumerating

- **BAD:** "There are three important aspects: first... second... third..."
- **GOOD:** Weave the points into flowing paragraphs where each idea emerges from the previous one through argumentative logic.
- **WHY:** Numbered lists in academic prose signal a textbook summary, not original argumentation. The argument should flow, with each point building on the previous through logical development.

## Citation Style Rules

<!-- Writer agent MUST follow these rules for every \cite{} command. Citation style
     is configured during thesis initialization and must remain consistent throughout.
     Default is ABNT NBR 10520 for Brazilian theses; APA for international programs.
     These rules govern in-text citations, not the bibliography format (which is handled
     by biblatex). -->

### Direct Quotations

- **Short quotes** (up to 3 lines): Inline with double quotes and `\cite{key}`
- **Block quotes** (more than 3 lines): Indented block with 10pt font, no quotes, `\cite{key}` at end
- Always include page number for direct quotes: `\cite[p.~45]{key}` or `\textcite[p.~45]{key}`

### Paraphrase Citations

- Author as subject: `\textcite{key}` -- renders as "Author (Year)"
- Author as reference: `\cite{key}` -- renders as "(Author, Year)" or "(AUTHOR, Year)" depending on style
- Multiple works: `\cites{key1}{key2}` or `\cite{key1,key2}`

### Multiple Authors

- Two authors: cite both -- "Silva and Santos (2023)" / `\textcite{silva2023}`
- Three or more: first author et al. -- "Silva et al. (2023)" / `\textcite{silva2023}` (biblatex handles this automatically)
- In bibliography: list all authors (biblatex default)

### Style-Specific Notes

{{CITATION_STYLE_NOTES}}

## Paragraph Rhythm

<!-- Paragraph rhythm controls the reading pace. Without intentional rhythm, AI-generated
     prose tends toward monotonous paragraph lengths and relentless abstraction. These rules
     force variation that keeps the reader engaged and prevents the "wall of theory" effect
     common in AI-generated academic writing. -->

- Alternate between theoretical discussion and empirical grounding
- Never more than 3 consecutive abstract paragraphs without a concrete example or data reference
- Section openings: Start with the section's contribution to the chapter argument, not a definition
- Section closings: End with connection to next section or synthesis, not a summary
- Vary paragraph length: a short paragraph after a dense passage creates emphasis
- Direct quotations break the texture -- use them strategically to let key authors speak

## Transition Patterns

<!-- Transitions in academic writing serve a different function than in literary prose.
     They must make the logical structure of the argument explicit. However, LLMs overuse
     generic connectors. The goal is transitions that are both explicit and content-rich. -->

### Preferred

- Logical connectors with content: "Having established that X [previous section's conclusion], the question becomes Y [next section's focus]."
- Section-level signposting: "The following section examines..." (at section boundaries, this is expected and helpful)
- Conceptual bridges: introduce the next concept in the closing paragraph of the current section
- Argumentative pivots: "However, this interpretation faces a challenge..."

### Banned Connectors

| Banned | Use Instead |
|--------|-------------|
| Furthermore / Moreover | [connect through content -- show why the next point follows from the previous] |
| It is important to note that | [delete -- state the point directly] |
| In this context | [specify which context -- be precise] |
| As mentioned above | [cite the specific section or restate briefly] |
| It goes without saying | [if it goes without saying, do not say it] |
| In conclusion | [let the synthesis speak for itself -- strong conclusions do not announce themselves] |

## Language Specifics

<!-- Language-specific rules ensure natural-sounding academic prose that avoids both
     LLM English patterns and overcorrection. These rules are populated during thesis
     initialization based on the selected language. -->

{{LANGUAGE_SPECIFICS}}

## Calibration Passages

<!-- Calibration passages are the single most powerful tool for voice consistency. The
     writer agent reads these before every chapter to calibrate its output. Target Voice
     passages represent the gold standard -- the agent should produce prose that feels
     like these. Anti-Voice passages show what to actively avoid. Minimum: 2 target
     voice passages, 2 anti-voice passages. The author should provide passages from
     their own writing or from authors whose academic voice they want to channel. -->

### Target Voice (GOLD STANDARD)

> [Add 2-3 calibration passages here. Choose passages that capture the exact voice,
> rhythm, and analytical register you want across the entire thesis. These are the
> most important lines in this document. Passages from your own prior academic
> writing work best.]

### Anti-Voice (WHAT TO AVOID)

> [Add 1-2 anti-voice passages here. Choose examples of the kind of academic writing
> this thesis must never produce -- overly jargon-heavy, AI-sounding, or stylistically
> inconsistent prose that would undermine the thesis's credibility.]
