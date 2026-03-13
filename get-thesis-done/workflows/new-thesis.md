<purpose>
Initialize a new thesis project through guided questioning. This is the most leveraged moment in any thesis project -- deep questioning here means better chapters, better consistency, better theoretical coherence. One workflow takes you from research idea to ready-for-chapter-planning.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## Step 1: Validate

**MANDATORY FIRST STEP -- Execute these checks before ANY user interaction:**

```bash
# Check if canonical documents already exist
[ -f ".planning/FRAMEWORK.md" ] && echo "FRAMEWORK_EXISTS=true" || echo "FRAMEWORK_EXISTS=false"
[ -f ".planning/STYLE_GUIDE.md" ] && echo "STYLE_EXISTS=true" || echo "STYLE_EXISTS=false"
[ -f ".planning/STRUCTURE.md" ] && echo "STRUCTURE_EXISTS=true" || echo "STRUCTURE_EXISTS=false"
```

**If any of the three files exist:** Warn the author:

Use AskUserQuestion:
- header: "Existing Thesis Project"
- question: "Thesis project already initialized. FRAMEWORK.md, STYLE_GUIDE.md, and/or STRUCTURE.md already exist. Proceeding will overwrite them."
- options:
  - "Continue" -- Overwrite existing documents with new content
  - "Cancel" -- Stop and keep existing documents

If "Cancel": Exit with message "Keeping existing documents. Use /gtd:progress to see current state."

**Check git is initialized:**

```bash
git rev-parse --is-inside-work-tree 2>/dev/null || git init
```

## Step 2: Deep Questioning

**Open the conversation:**

Ask inline (freeform, NOT AskUserQuestion):

"What is your thesis about?"

Wait for their response. This gives you the context needed to ask intelligent follow-up questions.

**Follow the thread naturally (not a form).** Based on what they say, probe deeper. Challenge vagueness, make the abstract concrete, surface assumptions, find the edges of the research.

**Areas to explore (adapt to what emerges from conversation):**

- **Research topic and question**: What is the central research question? What knowledge gap does it address? What existing literature is being extended or challenged?
- **Thesis level**: Graduation (TCC), Master's (Dissertacao), or PhD (Tese)? This affects expected rigor, depth, original contribution requirements, and word count targets.
- **Advisor**: Who is the advisor? Any co-advisor? What is the research group or lab? What is the advisor's area of expertise and how does it relate to the thesis topic?
- **Institution**: University name, department or program, city. This determines formatting norms and institutional requirements.
- **Academic norms**: ABNT (default for Brazilian institutions), APA, IEEE? Which specific standard version? Any institutional template overrides?
- **Language**: Primary language (PT-BR, EN, ES)? Secondary language for abstract? Any bilingual requirements?
- **Methodology**: What research methods will be employed? Qualitative, quantitative, mixed methods? What is the theoretical framework or paradigm? Are there specific tools, instruments, or data sources?
- **Structure**: How many chapters? What is the progression? The typical structure is Introduction, Literature Review, Methodology, Results, Discussion, Conclusion -- but this varies by discipline and research type. What does the advisor expect?
- **Key terms**: Technical terms that need precise definitions. Terms with specific meanings in the research context that differ from everyday usage. Theoretical constructs that must be defined rigorously.
- **Boundaries**: What is this thesis NOT about? What topics are explicitly excluded? What adjacent questions will NOT be answered? What limitations are acknowledged upfront?
- **Existing references**: Do they already have a .bib file from Zotero, Mendeley, or another manager? Key authors or foundational works already identified?
- **Timeline**: Defense deadline? Qualification exam date? This affects target lengths, urgency, and milestone planning.

**Follow the thread.** Each answer opens new threads to explore. Ask about:
- What excited them about this research
- What problem or gap sparked the investigation
- What they mean by vague or technical terms
- What specific results or outcomes they expect
- What is already decided vs. what is still being explored
- What the advisor has specifically required or suggested

**Check readiness (background, not out loud):**

As you go, mentally check whether you can fill these documents:
- FRAMEWORK.md: research question/thesis statement, at least 2 glossary terms with contrastive definitions, at least 1 methodological commitment
- STYLE_GUIDE.md: academic voice register, citation style (ABNT/APA/IEEE)
- STRUCTURE.md: chapter structure with at least thesis and key points per chapter
- main.tex: title, author, advisor, institution, language

**Decision gate:**

When you have enough to populate the templates, use AskUserQuestion:

- header: "Ready to scaffold?"
- question: "I think I have enough to set up your thesis project. Want to discuss anything else, or shall I create the project structure?"
- options:
  - "Create the project" -- Scaffold directories and populate canonical documents
  - "Keep exploring" -- I want to share more or ask me more

If "Keep exploring" -- ask what they want to add, or identify gaps and probe naturally.

Loop until "Create the project" selected.

## Step 3: Scaffold

Run `gtd-tools.js init` to create the dual-track directory structure and empty templates:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js init --language {{language}} --level {{level}}
```

Where `{{language}}` is one of: pt-BR, en, es (from the questioning)
Where `{{level}}` is one of: graduation, masters, phd (from the questioning)

This creates:
- `.planning/FRAMEWORK.md` -- Theoretical framework (from template)
- `.planning/STYLE_GUIDE.md` -- Writing style guide (from template)
- `.planning/STRUCTURE.md` -- Thesis structure and chapter plan (from template)
- `.planning/FIGURES.md` -- Figure catalog (from template)
- `.planning/thesis.json` -- Thesis configuration (level, language, norm, created date)
- `.planning/chapters/` -- Per-chapter planning directories
- `src/main.tex` -- Main LaTeX file (from template)
- `src/chapters/` -- Chapter .tex files directory
- `src/references.bib` -- Bibliography file (from template)
- `src/references/` -- Source PDF storage
- `src/figures/` -- Figure files directory

Verify scaffolding succeeded:

```bash
[ -f ".planning/FRAMEWORK.md" ] && echo "FRAMEWORK.md scaffolded" || echo "ERROR: FRAMEWORK.md not created"
[ -f ".planning/STYLE_GUIDE.md" ] && echo "STYLE_GUIDE.md scaffolded" || echo "ERROR: STYLE_GUIDE.md not created"
[ -f ".planning/STRUCTURE.md" ] && echo "STRUCTURE.md scaffolded" || echo "ERROR: STRUCTURE.md not created"
[ -f ".planning/FIGURES.md" ] && echo "FIGURES.md scaffolded" || echo "ERROR: FIGURES.md not created"
[ -f ".planning/thesis.json" ] && echo "thesis.json scaffolded" || echo "ERROR: thesis.json not created"
[ -f "src/main.tex" ] && echo "main.tex scaffolded" || echo "ERROR: main.tex not created"
[ -f "src/references.bib" ] && echo "references.bib scaffolded" || echo "ERROR: references.bib not created"
[ -d "src/chapters" ] && echo "src/chapters/ exists" || echo "ERROR: src/chapters/ not created"
[ -d "src/references" ] && echo "src/references/ exists" || echo "ERROR: src/references/ not created"
[ -d "src/figures" ] && echo "src/figures/ exists" || echo "ERROR: src/figures/ not created"
[ -d ".planning/chapters" ] && echo ".planning/chapters/ exists" || echo "ERROR: .planning/chapters/ not created"
```

If any critical file was not created, report the error and stop.

## Step 4: Populate Templates

Use the Write tool to populate each template with the author's answers from Step 2. Do NOT generate templates from scratch -- read the scaffolded file, then replace `{{PLACEHOLDER}}` values with the author's content while preserving HTML comment instructions and markdown structure.

**CRITICAL:** Read each template BEFORE writing to understand its structure. Preserve all YAML frontmatter fields and HTML comment instructions. Only replace placeholder content, never delete structural elements.

**CRITICAL:** Populate one template at a time to stay within context budget. Read, populate, write, then move to the next.

### 4a: Populate FRAMEWORK.md

Read `.planning/FRAMEWORK.md` first.

Populate:
- **Thesis title** in frontmatter (`thesis_title:`) and H1 heading
- **Level** in frontmatter
- **Language** in frontmatter
- **Date** in frontmatter (`last_updated`) and placeholder
- **Thesis Statement** (from research question discussion -- 2-3 sentences capturing the central research question or hypothesis)
- **Glossary** (from key terms discussion -- each term with precise definition AND what it does NOT mean, using contrastive definitions)
- **Research Positions** (from methodology/boundary discussions -- methodological and theoretical commitments the thesis defends)

Leave these sections with template placeholders (they grow organically with chapters):
- Continuity Map (Figures, Key Arguments, Open Threads)
- Recurring Elements Registry
- Changelog

Update frontmatter: `last_updated` to today's date, `updated_after` to "Init".

### 4b: Populate STYLE_GUIDE.md

Read `.planning/STYLE_GUIDE.md` first.

Populate:
- **Thesis title** in frontmatter and H1 heading
- **Level** in frontmatter
- **Language** in frontmatter
- **Citation style** in frontmatter (ABNT/APA/IEEE)
- **Voice Profile** (academic register: formal but accessible, third person or passive voice as appropriate for the discipline, objective tone)
- **Citation Rules** (based on chosen norm -- ABNT parenthetical/narrative, APA author-date, IEEE numbered)
- **Language Specifics** (Portuguese BR academic conventions, or English academic conventions, as appropriate)

Leave these sections with template placeholders (filled when first chapter is written):
- Calibration Passages (require actual prose samples)

Preserve Paragraph Rhythm, Transition Patterns, and structural sections as-is from template.

Update frontmatter: `last_updated` to today's date.

### 4c: Populate STRUCTURE.md

Read `.planning/STRUCTURE.md` first.

Populate:
- **Thesis title** in frontmatter (`thesis_title:`, `total_chapters:`) and H1 heading
- **Level** in frontmatter
- **Thesis-Level Arc** (opening state, closing state, core argument movement from structure discussion)
- **Chapter structure** (from structure discussion):
  - For each chapter: title, thesis/purpose, key points, connections to other chapters, reserved topics
  - Arc position for each chapter (introduction, development, synthesis)
  - Target length (reasonable defaults based on thesis level if not discussed)
- **Dependency Map** (derive from chapter connections -- which chapters require prior chapters to be read first)
- **Methodological Arc** (how the methodology unfolds across chapters -- theoretical grounding, method description, application, results)

Leave Reserved/Do Not Touch entries to be refined as chapters develop.

Update frontmatter: `last_updated` to today's date.

### 4d: Populate main.tex

Read `src/main.tex` first.

Replace all `{{PLACEHOLDER}}` values:
- `{{THESIS_TITLE}}` -- The thesis title
- `{{AUTHOR_NAME}}` -- The author's name
- `{{ADVISOR_NAME}}` -- The advisor's name
- `{{INSTITUTION}}` -- University/institution name
- `{{CITY}}` -- City
- `{{YEAR}}` -- Current year or defense year
- `{{WORK_TYPE}}` -- Based on level: "Trabalho de Conclusao de Curso" (graduation), "Dissertacao (Mestrado)" (master's), "Tese (Doutorado)" (PhD)
- `{{PREAMBLE}}` -- Institutional preamble text (e.g., "Dissertacao apresentada ao Programa de Pos-Graduacao em [area] da [instituicao]...")
- `{{LANGUAGE_BABEL}}` -- Babel language: "brazil" for PT-BR, "english" for EN, "spanish" for ES
- `{{ABSTRACT_PT}}` -- "[Resumo a ser escrito]" (placeholder)
- `{{ABSTRACT_EN}}` -- "[Abstract to be written]" (placeholder)
- `{{KEYWORDS_PT}}` -- Key terms in Portuguese (or placeholder)
- `{{KEYWORDS_EN}}` -- Key terms in English (or placeholder)
- `{{CHAPTER_INCLUDES}}` -- Generate `\include{chapters/NN-slug}` lines for each chapter in the structure

### 4e: Generate chapter stubs

For each chapter in the structure:

1. Create `src/chapters/NN-slug.tex` from the chapter.tex template:
   - Replace `{{CHAPTER_NUMBER}}` with the chapter number
   - Replace `{{CHAPTER_TITLE}}` with the chapter title
   - Replace `{{CHAPTER_LABEL}}` with a slug (e.g., "introduction", "literature-review")
   - Replace section placeholders with actual section titles from the structure discussion
   - Add or remove sections as needed to match the chapter plan

2. Create `.planning/chapters/NN-slug/` directory for per-chapter planning files

### 4f: Populate FIGURES.md

Read `.planning/FIGURES.md` first.

Populate:
- **Thesis title** in frontmatter and H1 heading
- **Date** in frontmatter
- Leave the figure catalog empty (figures are added as chapters are written)

### 4g: Verify thesis.json

Read `.planning/thesis.json` (already created by init).

Verify it contains:
- `level` -- matches the discussed level
- `language` -- matches the discussed language
- `norm` -- matches the selected citation standard (ABNT/APA/IEEE)
- `created` -- has a valid date

If any field is incorrect, update the file.

## Step 5: Verify Compilation

Attempt a test compilation to verify the scaffolded project produces a valid PDF:

```bash
cd src && node ~/.claude/get-thesis-done/bin/gtd-tools.js compile
```

**If compilation succeeds:** Report "PDF compiled successfully. Scaffolded project is structurally correct."

**If compilation fails:** Diagnose and attempt to fix common issues:
- "Undefined control sequence" -- likely a missing LaTeX package or incorrect command
- "File not found" -- a `\include{}` target does not exist
- "Missing $ inserted" -- math mode issue in metadata
- Encoding problems -- check babel language and inputenc settings
- Missing packages -- check requirements.txt for needed TeX Live packages

**If latexmk is not installed:** Skip with warning:
"LaTeX compilation skipped: latexmk not found. Install TeX Live to compile. See: https://tug.org/texlive/"

This is not a failure -- the author can install TeX Live later.

## Step 6: Commit

Commit all populated documents and generated files:

```bash
git add .planning/FRAMEWORK.md .planning/STYLE_GUIDE.md .planning/STRUCTURE.md .planning/FIGURES.md .planning/thesis.json .planning/chapters/ src/
git commit -m "docs: initialize thesis project with populated canonical documents and LaTeX structure"
```

## Step 7: Report

Present completion with thesis-specific summary and next steps:

```
Thesis project initialized:

  FRAMEWORK.md: Research question, glossary, and positions populated
  STYLE_GUIDE.md: Academic voice profile and citation rules populated
  STRUCTURE.md: Structure with [N] chapters populated
  main.tex: LaTeX template configured for [INSTITUTION]
  [N] chapter stubs created in src/chapters/

  Thesis: [TITLE]
  Level: [graduation/master's/PhD]
  Language: [PT-BR/EN/ES]
  Norms: [ABNT/APA/IEEE]

Next steps:
  - Discuss a chapter: /gtd:discuss-chapter 1
  - Check progress: /gtd:progress
  - Compile PDF: /gtd:compile
```

</process>

<terminology>

## Thesis-Native Terminology

This workflow uses thesis-native terms throughout. Never use software/project management jargon in author-facing messages.

| Thesis Term | NOT This |
|-------------|----------|
| Thesis | Project |
| Chapter | Phase |
| Research question | Core value |
| Advisor | Stakeholder |
| Author | User |
| Canonical documents | Planning files |
| Literature review | Background research |
| Methodology | Implementation plan |
| Defense | Deadline |

</terminology>

<what_not_to_do>

- Do NOT generate templates from scratch -- always scaffold via CLI first, then populate
- Do NOT load all templates into memory at once -- read and populate one at a time
- Do NOT fill sections the author did not discuss -- leave them with template placeholders
- Do NOT ask implementation/technical questions -- this is about the thesis content, methodology, and research
- Do NOT use software jargon -- say "chapters" not "phases", "research question" not "core value"
- Do NOT rush the questioning -- depth here saves time in every subsequent chapter
- Do NOT skip the compilation verification step
- Do NOT assume a standard structure without asking -- thesis structures vary by discipline
- Do NOT generate bibliography entries -- only the author's verified references belong in .bib

</what_not_to_do>

<context_efficiency>

## Context Budget

The workflow runs in the main context (not subagents) since questioning requires conversation. Keep template reads minimal -- read section-by-section when populating, not all at once. Target ~35% context for the full questioning + population + compilation flow.

Budget breakdown:
- Questioning: ~15% (conversation with author about research)
- Template reads + writes: ~15% (one template at a time)
- Compilation verification: ~5% (compile test and diagnostics)

</context_efficiency>

<success_criteria>

## Verification

A successful thesis initialization produces:

- [ ] FRAMEWORK.md exists with thesis statement, glossary terms (with contrastive definitions), and research positions populated
- [ ] STYLE_GUIDE.md exists with academic voice profile, citation rules, and language-specific conventions
- [ ] STRUCTURE.md exists with thesis-level arc, chapter structure with per-chapter contracts (thesis, key points, connections), and dependency map
- [ ] FIGURES.md exists with thesis title set and empty catalog
- [ ] main.tex has all {{PLACEHOLDER}} values replaced with author's information
- [ ] Chapter stubs exist in src/chapters/ matching the structure plan
- [ ] .planning/chapters/ directories exist for each chapter
- [ ] thesis.json contains correct level, language, norm, and created date
- [ ] references.bib exists (empty or with author's initial references)
- [ ] All documents preserve template HTML comments and structural elements
- [ ] All documents have updated frontmatter (thesis title, last_updated)
- [ ] Populated documents are committed to git
- [ ] Only sections the author discussed are populated -- unfilled sections retain template placeholders
- [ ] All author-facing messages use thesis-native terminology
- [ ] Compilation attempted (success or skipped with clear explanation)

</success_criteria>
