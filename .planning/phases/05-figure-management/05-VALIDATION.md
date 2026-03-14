# Phase 5: Figure Management - Validation Architecture

**Phase:** 05-figure-management
**Created:** 2026-03-13
**Source:** 05-RESEARCH.md Validation Architecture section

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none -- uses `node --test` directly |
| Quick run command | `node --test get-thesis-done/bin/gtd-tools.test.js` |
| Full suite command | `node --test get-thesis-done/bin/gtd-tools.test.js` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIG-01 | register-figure adds row to FIGURES.md with correct columns | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "register-figure"` | No -- Wave 0 |
| FIG-02 | preProcessFigures exports .excalidraw to PDF (mocked) | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "preprocess.*excalidraw"` | No -- Wave 0 |
| FIG-03 | TikZ figures registered with type=tikz, no export needed | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "tikz"` | No -- Wave 0 |
| FIG-04 | parseFiguresCatalog parses FIGURES.md table correctly | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "parse.*catalog"` | No -- Wave 0 |
| FIG-05 | validate-figs finds orphaned refs and missing catalog entries | unit | `node --test get-thesis-done/bin/gtd-tools.test.js --test-name-pattern "validate-figs"` | No -- Wave 0 |

## Sampling Rate

- **Per task commit:** `node --test get-thesis-done/bin/gtd-tools.test.js`
- **Per wave merge:** `node --test get-thesis-done/bin/gtd-tools.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

## Wave 0 Gaps

- [ ] `get-thesis-done/bin/gtd-tools.test.js` -- test file referenced in package.json but does not exist yet; needs creation with test infrastructure
- [ ] Test fixtures: sample .excalidraw file, sample .tikz file, sample FIGURES.md with entries, sample .tex files with `\ref{fig:*}`
- [ ] Mock strategy for excalirender/rsvg-convert (external binaries) -- tests should not require these installed; mock `execSync` or test parsing/validation logic separately from export execution
