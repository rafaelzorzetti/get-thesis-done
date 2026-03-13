---
phase: 3
slug: academic-review-continuity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification via grep + file existence checks |
| **Config file** | none — verification embedded in plan execution |
| **Quick run command** | `grep -c "FRAMEWORK\|STRUCTURE\|gtd-tools\|DRAFT\.tex" agents/reviewer.md` |
| **Full suite command** | Manual verification checklist per plan |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run grep-based verification (stale GWD refs, required terms present)
- **After every plan wave:** Run full checklist verification
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | REVIEW-01 | smoke | `[ -f commands/gtd/review-chapter.md ] && echo PASS` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | REVIEW-02 | unit | `grep -c "validate-citations" agents/reviewer.md` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | REVIEW-03 | unit | `grep -c "Methodological" agents/reviewer.md` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | REVIEW-04 | unit | `grep -c "FRAMEWORK\|position\|continuity" agents/reviewer.md` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | REVIEW-05 | unit | `grep -c "ABNT\|APA\|formatting" agents/reviewer.md` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | REVIEW-06 | unit | `grep -c "max_revisions\|revision_count" get-thesis-done/workflows/review-chapter.md` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | REVIEW-07 | smoke | `[ -f get-thesis-done/workflows/continuity-loop.md ] && echo PASS` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `agents/reviewer.md` — complete rewrite (4 thesis categories)
- [ ] `agents/framework-keeper.md` — does not exist yet (adapted from bible-keeper.md)
- [ ] `agents/summary-writer.md` — needs thesis-section adaptation
- [ ] `get-thesis-done/workflows/review-chapter.md` — does not exist yet
- [ ] `get-thesis-done/workflows/continuity-loop.md` — does not exist yet
- [ ] `commands/gtd/review-chapter.md` — does not exist yet
- [ ] `gtd-tools.js framework update` — placeholder only, needs implementation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Review produces actionable findings | REVIEW-01 | Qualitative assessment of output | Run review on test chapter, verify findings are specific and actionable |
| Continuity loop updates correct FRAMEWORK.md sections | REVIEW-07 | Semantic correctness of extraction | Compare FRAMEWORK.md before/after, verify new terms and positions added correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
