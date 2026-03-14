<purpose>
Orchestrate figure registration, source file scaffolding, and LaTeX snippet generation for the thesis. Receive figure details from the user (ID, type, chapter, caption), delegate registration to the CLI, create the appropriate source file scaffold, generate the LaTeX inclusion snippet, run validation, and commit changes. Present all results to the researcher with clear next steps.
</purpose>

<core_principle>
CLI commands do the mechanical work (register in FIGURES.md, validate references). This workflow orchestrates the sequence: gather figure details, register via CLI, create source files, generate LaTeX snippets, validate, and commit. The figure-manager agent is not spawned for simple registrations -- the workflow handles the complete flow directly. The agent is available for complex validation scenarios (future enhancement).
</core_principle>

<terminology>

## Thesis-Native Terminology

This workflow uses thesis-native terminology throughout. The mapping:

| This Workflow Says | NOT This |
|--------------------|----------|
| figure | image asset |
| figure catalog | figure database |
| FIGURES.md | figure registry |
| caption | description |
| thesis | book |
| chapter | phase |
| researcher | author (literary) |
| FRAMEWORK.md | BIBLE.md |
| STRUCTURE.md | OUTLINE.md |
| gtd-tools.js | gwd-tools.js |
| get-thesis-done | get-writing-done |
| /gtd:* | /gwd:* |

All communication with the researcher uses the left column. The right column terms never appear in researcher-facing messages.

</terminology>

<process>

<step name="gather_details" priority="first">

## Step 1: Gather Figure Details

Receive arguments from user via `/gtd:add-figure`.

**Parse the following from $ARGUMENTS or ask the user if missing:**

1. **ID** (required): The figure identifier. Will be normalized to kebab-case. Ask: "What ID should this figure have? (e.g., system-architecture, data-flow-diagram)"
2. **Type** (required): One of `excalidraw`, `tikz`, or `static`. Ask: "What type of figure? Options: excalidraw (hand-drawn diagram), tikz (LaTeX-native precise diagram), static (existing image file PNG/PDF/JPG)"
3. **Chapter** (required): Which chapter this figure belongs to. Ask: "Which chapter will this figure appear in? (number)"
4. **Caption** (required): The figure caption text. Ask: "What caption should this figure have?"

If the user provides all details inline (e.g., `/gtd:add-figure system-arch --type excalidraw --chapter 3 --caption "System architecture overview"`), parse them directly without asking.

If arguments are partially provided, only ask for the missing ones.

**Validate:**
- Type must be one of: excalidraw, tikz, static
- Chapter must be a positive integer
- ID will be auto-normalized (inform user: "ID normalized to: {kebab-case-id}")

</step>

<step name="register">

## Step 2: Register Figure in Catalog

Run the register-figure CLI command:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js register-figure --id "{id}" --type "{type}" --chapter {chapter} --caption "{caption}" --raw
```

Parse the output. Report registration success to the user.

If the CLI reports a duplicate ID error, inform the user and ask for a different ID.

If FIGURES.md is not found, instruct the user to run `/gtd:new-thesis` first.

</step>

<step name="scaffold">

## Step 3: Create Source File Scaffold

Based on the figure type, create the appropriate source file in `src/figures/`:

### For excalidraw type:

Create `src/figures/{id}.excalidraw` with a valid empty Excalidraw JSON:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

Also create the `src/figures/exports/` directory if it doesn't exist (for future exports).

Tell the user: "Created empty Excalidraw canvas at src/figures/{id}.excalidraw. Open this file in Excalidraw (https://excalidraw.com or VS Code extension) to create your diagram. The figure will be automatically exported to PDF during compilation (`/gtd:compile`)."

### For tikz type:

Create `src/figures/{id}.tikz` with a template:

```latex
% TikZ figure: {caption}
% This file is included via \input{figures/{id}.tikz} in the chapter
\begin{tikzpicture}
  % TODO: Add your TikZ drawing here
  % Example: \draw (0,0) rectangle (4,3);
  % Example: \node at (2,1.5) {Placeholder};
  \node[draw, rounded corners, minimum width=4cm, minimum height=2cm] {TODO: {caption}};
\end{tikzpicture}
```

Tell the user: "Created TikZ template at src/figures/{id}.tikz. Edit this file to create your diagram. TikZ figures compile inline with LaTeX -- no export step needed."

### For static type:

Create the `src/figures/` directory if it doesn't exist.

Do NOT create a placeholder image file.

Tell the user: "Place your image file at src/figures/{id}.png (or .pdf/.jpg). The source file path in FIGURES.md has been set to figures/{id}.png -- update it in FIGURES.md if you use a different extension. Static images are included directly by LaTeX via \includegraphics."

</step>

<step name="latex_snippet">

## Step 4: Generate LaTeX Snippet

Generate and present the LaTeX snippet the researcher should insert into their chapter .tex file:

### For excalidraw type:

```latex
% Figure: {caption} (Chapter {chapter})
\begin{figure}[htb]
  \caption{\label{fig:{id}}{caption}}
  \begin{center}
    \includegraphics[width=0.8\textwidth]{exports/{id}}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}
```

### For static type (no `exports/` prefix -- static files are in `figures/` directly):

```latex
% Figure: {caption} (Chapter {chapter})
\begin{figure}[htb]
  \caption{\label{fig:{id}}{caption}}
  \begin{center}
    \includegraphics[width=0.8\textwidth]{{id}}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}
```

### For tikz type:

```latex
% Figure: {caption} (Chapter {chapter})
\begin{figure}[htb]
  \caption{\label{fig:{id}}{caption}}
  \begin{center}
    \input{figures/{id}.tikz}
  \end{center}
  \legend{Fonte: os autores}
\end{figure}
```

**Present the snippet with instructions:**

- "Insert this LaTeX snippet into your Chapter {chapter} .tex file where you want the figure to appear."
- "The `\caption{\label{}}` comes BEFORE the image (abnTeX2/ABNT convention: caption above the figure)."
- "Update `\legend{Fonte: os autores}` with the actual source attribution if needed."
- "Reference this figure in text with: `conforme ilustrado na \autoref{fig:{id}}`"

</step>

<step name="validate">

## Step 5: Run Validation

After registration, run figure validation to check overall health:

```bash
node ~/.claude/get-thesis-done/bin/gtd-tools.js validate-figs --raw
```

Present results to the user:

- If 0 missing references: "All figure references across all chapters have corresponding FIGURES.md entries."
- If missing references exist: list them per chapter with a suggestion to register the missing figures.
- If unreferenced catalog entries exist: note them as informational ("These figures are registered but not yet referenced in any chapter" -- this is expected for newly registered figures).

</step>

<step name="commit">

## Step 6: Commit Changes

Commit the FIGURES.md update and any created source files:

```bash
git add .planning/FIGURES.md src/figures/
git commit -m "fig: add figure {id} ({type}) for chapter {chapter}"
```

Report the commit to the user.

</step>

<step name="summary">

## Step 7: Summary

Present a final summary:

```
## Figure Addition Summary

**ID:** {id}
**Type:** {type}
**Chapter:** {chapter}
**Caption:** {caption}
**Source file:** {source_file_path}
**Catalog:** .planning/FIGURES.md
**Validation:** {status}
```

**Next steps by type:**

- For excalidraw: "Open src/figures/{id}.excalidraw in Excalidraw, create your diagram, then run /gtd:compile to export and build."
- For tikz: "Edit src/figures/{id}.tikz with your TikZ code, then run /gtd:compile to build."
- For static: "Place your image at src/figures/{id}.png, then run /gtd:compile to build."
- For all: "Insert the LaTeX snippet into your chapter .tex file. The figure will appear in the compiled PDF."

</step>

</process>

<constraints>

## Workflow Constraints

- The workflow does NOT spawn the figure-manager agent for simple registrations. The workflow handles the complete flow directly.
- The workflow handles one figure at a time. For batch registration, the user runs `/gtd:add-figure` multiple times.
- All error messages use thesis-native terminology.
- The workflow never modifies chapter .tex files -- it presents snippets for the researcher to insert.
- The workflow uses `\autoref{fig:*}` in examples (abnTeX2 convention) rather than `\ref{fig:*}`.

</constraints>

<error_handling>

## Error Recovery

**FIGURES.md not found:**
- Report: "FIGURES.md not found. Run /gtd:new-thesis first to scaffold the thesis project."

**Duplicate figure ID:**
- Report: "A figure with ID '{id}' already exists in FIGURES.md."
- Ask the user for a different ID.

**Invalid figure type:**
- Report: "Invalid figure type '{type}'. Must be one of: excalidraw, tikz, static."

**Invalid chapter number:**
- Report: "Chapter must be a positive integer."

**Permission error (cannot write to FIGURES.md or src/figures/):**
- Report the permission error and suggest checking file/directory permissions.

</error_handling>

<context_efficiency>

## Context Budget

This workflow is lightweight (~25% context):

1. **CLI does the heavy lifting.** The workflow runs register-figure and validate-figs CLI commands. No FIGURES.md parsing happens in the workflow itself.
2. **No agent spawn for simple operations.** Registration, scaffolding, and snippet generation are fully handled by the workflow directly.
3. **Sequential steps, no accumulation.** Each step runs its action and presents results. No cross-step state beyond the figure details.

</context_efficiency>
