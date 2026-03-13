---
phase: 4
slug: reference-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification via CLI + file checks |
| **Config file** | none — verification embedded in plan execution |
| **Quick run command** | `node get-thesis-done/bin/gtd-tools.js validate-refs --raw 2>/dev/null; echo $?` |
| **Full suite command** | Manual verification checklist per plan |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node get-thesis-done/bin/gtd-tools.js validate-refs --raw 2>/dev/null; echo $?`
- **After every plan wave:** Run full validation checklist
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | REF-01 | smoke | `echo '@article{test2024, author={Test}, title={Test}, year={2024}}' > /tmp/test.bib && node get-thesis-done/bin/gtd-tools.js import-bib --file /tmp/test.bib` | Wave 0 | ⬜ pending |
| 04-01-02 | 01 | 1 | REF-02 | integration | `node get-thesis-done/bin/gtd-tools.js fetch-doi --doi 10.1038/nature12373 --raw` | Wave 0 | ⬜ pending |
| 04-01-03 | 01 | 1 | REF-03 | integration | `node get-thesis-done/bin/gtd-tools.js pdf-meta --file test.pdf --raw` | Wave 0 | ⬜ pending |
| 04-01-04 | 01 | 1 | REF-04 | unit | `node get-thesis-done/bin/gtd-tools.js validate-refs --raw` | Wave 0 | ⬜ pending |
| 04-01-05 | 01 | 1 | REF-05 | unit | `node get-thesis-done/bin/gtd-tools.js pdf-refs --raw` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `gtd-tools.js import-bib` — new CLI command for .bib file import
- [ ] `gtd-tools.js fetch-doi` — new async CLI command for Crossref DOI fetch
- [ ] `gtd-tools.js pdf-meta` — new async CLI command for PDF metadata extraction
- [ ] `gtd-tools.js validate-refs` — new CLI command extending validateCitations for cross-chapter
- [ ] `gtd-tools.js pdf-refs` — new CLI command for PDF cross-reference check
- [ ] `agents/reference-manager.md` — agent definition does not exist yet
- [ ] `get-thesis-done/workflows/add-reference.md` — workflow does not exist yet
- [ ] `commands/gtd/add-reference.md` — command definition does not exist yet

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DOI fetch returns valid BibTeX | REF-02 | Requires network access to Crossref | Run `node gtd-tools.js fetch-doi --doi 10.1038/nature12373 --raw` and verify BibTeX output |
| PDF metadata extraction | REF-03 | Requires poppler-utils + sample PDF | Run `node gtd-tools.js pdf-meta --file sample.pdf --raw` with a real academic PDF |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
