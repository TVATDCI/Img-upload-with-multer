# Momus Review: img-upload-v2.0
**Date:** 2026-05-05
**Reviewer:** Momus (deep analysis)
**Artifacts reviewed:**
- PRD: `/home/vladi/projects/GitHub/Img-upload-with-multer/.sisyphus/prds/img-upload-v2.0-prd.md`
- Plan: not reviewed

## Summary

**Gate Decision:** WARNING  
**Blocker count:** 4 total (0 critical, 3 major, 1 minor)

### Top 3 Risks
1. **Unspecified variant dimensions** — `thumb`, `preview`, and `full` exist in name only, which makes implementation and verification inconsistent.
2. **Undefined SSE payload contract** — frontend progress UI depends on an event schema that the PRD explicitly leaves as an open question.
3. **Undefined album cover fallback rule** — acceptance criteria require deterministic behavior when a cover image is deleted, but the rule is not specified.

## Detailed Findings

### A. Logical Contradictions
No blockers found in Logical Contradictions.

### B. Scope Creep
No blockers found in Scope Creep.

### C. Missing Verification

C-1: MAJOR — Variant sizes are named but not defined
- Location: PRD lines 30, 87, 357-360
- Evidence: "Generate deterministic image variants (`thumb`, `preview`, `full`)" and "variant set limited to `thumb`, `preview`, `full`"
- Problem: The PRD never defines target dimensions, fit rules, or whether `full` means original-size derivative or bounded resize. QA cannot verify correctness and backend/frontend implementations may diverge.
- Fix: Add an explicit variant contract table with pixel bounds, format rules, and crop/fit behavior for each size.

C-2: MAJOR — SSE progress contract is still undefined
- Location: PRD lines 121-123, 323
- Evidence: "Each batch upload returns a `jobId`" plus open question "What exact payload shape should `/uploads/progress/:jobId` use"
- Problem: Slice 3 and Slice 4 both depend on the progress payload, but the wire contract is unresolved. This blocks objective verification of the progress UI and event stream.
- Fix: Freeze an event schema now: event names, per-file fields, aggregate fields, terminal-state semantics, and reconnect behavior.

C-3: MAJOR — Album cover fallback is required but unspecified
- Location: PRD lines 181-183
- Evidence: "Album cover image behavior is deterministic when the assigned cover is deleted or moved."
- Problem: The acceptance criterion demands determinism without stating the rule. Different implementations could choose first image, newest image, null cover, or manual fallback.
- Fix: Define the fallback rule explicitly in the PRD and test against it.

### D. Dependency Gaps
No blockers found in Dependency Gaps.

### E. Integration Risks

E-1: MINOR — In-memory progress registry assumes single-instance stability
- Location: PRD lines 233, 363
- Evidence: "In-memory job registry with TTL for progress" and "transient upload job progress lives in in-memory registry with TTL cleanup"
- Risk: Progress state disappears on process restart and does not scale across multiple app instances. That may be acceptable for v2.0, but the operational constraint is not called out as an explicit non-goal or deployment assumption.
- Fix: Add a deployment note that v2.0 progress tracking is single-instance/process-local, or define a future persistence upgrade trigger.

### F. Resource & Assumption Risks
No blockers found in Resource & Assumption Risks.

## Fix Recommendations (Priority Order)

1. **MAJOR** Variant sizes are named but not defined — add a variant contract table with exact dimensions and fit rules — Effort: small
2. **MAJOR** SSE progress contract is still undefined — specify the event payload and terminal semantics for `/uploads/progress/:jobId` — Effort: small
3. **MAJOR** Album cover fallback is required but unspecified — define deterministic fallback behavior in PRD acceptance criteria — Effort: trivial
4. **MINOR** In-memory progress registry assumes single-instance stability — document the deployment constraint — Effort: trivial

## Questions for User

1. What exact pixel contract should `thumb`, `preview`, and `full` follow?
2. Should completed/failed SSE jobs survive process restart, or is process-local progress acceptable for v2.0?
3. When an album cover image is removed, should the cover become `null`, oldest remaining image, newest remaining image, or a manually reassigned value?

```json
{
  "decision": "WARNING",
  "artifact_path": "/home/vladi/projects/GitHub/Img-upload-with-multer/.sisyphus/prds/img-upload-v2.0-prd.md",
  "summary": "PRD is structurally strong, but execution readiness is reduced by three unresolved contract gaps: variant dimensions, SSE payload schema, and album cover fallback behavior.",
  "blockers": [
    {
      "id": "C-1",
      "severity": "MAJOR",
      "category": "Missing Verification",
      "title": "Variant sizes are named but not defined",
      "fix": "Add an explicit variant contract table with pixel bounds, fit rules, and format behavior for thumb, preview, and full."
    },
    {
      "id": "C-2",
      "severity": "MAJOR",
      "category": "Missing Verification",
      "title": "SSE progress contract is still undefined",
      "fix": "Freeze the /uploads/progress/:jobId event schema, required fields, terminal states, and reconnect expectations in the PRD."
    },
    {
      "id": "C-3",
      "severity": "MAJOR",
      "category": "Missing Verification",
      "title": "Album cover fallback is required but unspecified",
      "fix": "Define the deterministic album cover fallback rule and add matching acceptance criteria."
    },
    {
      "id": "E-1",
      "severity": "MINOR",
      "category": "Integration Risk",
      "title": "In-memory progress registry assumes single-instance stability",
      "fix": "Document process-local SSE progress as an explicit v2.0 deployment constraint or define a persistence upgrade trigger."
    }
  ],
  "next_action": "fix_then_recheck"
}
```