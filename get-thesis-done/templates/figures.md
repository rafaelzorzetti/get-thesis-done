---
type: figures_catalog
thesis_title: "{{THESIS_TITLE}}"
last_updated: "{{DATE}}"
---

# Figure Catalog: {{THESIS_TITLE}}

## Figures

<!-- Track every figure in the thesis. Each figure must be registered here before being
     referenced in any chapter with \ref{fig:ID}.

     Types:
     - excalidraw: Created in Excalidraw (.excalidraw file), exported to PDF/PNG during compilation
     - tikz: TikZ/PGF code compiled inline within LaTeX (no pre-processing needed)
     - static: Pre-made image file (PNG, PDF, JPG) placed directly in figures/ directory

     Statuses:
     - planned: Registered in catalog but not yet created
     - created: Source file exists but not yet exported/verified
     - exported: Exported to final format (PDF/PNG) and ready for inclusion
     - included: Referenced in a chapter with \includegraphics or TikZ environment

     The compilation pipeline validates that every \ref{fig:ID} in .tex files has a
     corresponding entry in this catalog with status "included". Orphaned references
     are flagged as errors. -->

| ID | Caption | Chapter | Type | Source File | Status |
|----|---------|---------|------|-------------|--------|
| | | | | | |

## Tables

<!-- Track every table in the thesis separately from figures. Each table must be
     registered here before being referenced in any chapter with \ref{tab:ID}.

     Tables in LaTeX use the {table} environment with \caption{} and \label{tab:ID}.
     Unlike figures, tables are typically authored directly in LaTeX and do not require
     source files or export steps. Track them here for cross-reference validation. -->

| ID | Caption | Chapter | Source | Status |
|----|---------|---------|--------|--------|
| | | | | |

## Validation

<!-- Figure and table validation rules:
     1. Every \ref{fig:ID} in any .tex file must have a matching ID in the Figures table above
     2. Every \ref{tab:ID} in any .tex file must have a matching ID in the Tables table above
     3. Every figure with status "included" must have its source file present in figures/
     4. Excalidraw figures must have been exported before compilation (checked by pre-processing step)
     5. Orphaned figures (in catalog but never referenced) generate warnings, not errors
     6. The /gtd:compile command runs this validation before the LaTeX build -->
