---
status: diagnosed
trigger: "G-01-1: Signup shows no error message when the password does not meet verification requirements."
created: 2026-08-29T10:42:00Z
updated: 2026-08-29T10:50:00Z
goal: find_root_cause_only
symptoms_prefilled: true
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: "Signup client treats passwords as valid at length >= 8 with advisory-only complexity checks; API passwordSchema requires 12 + complexity. On 400 the page toasts data.error ('Validation failed') via react-hot-toast and never maps details onto field errors. react-hot-toast Toaster is commented out; only Sonner is mounted — so the 400 is a silent no-op in the UI."
test: "Read signup page, validation.ts, signup route, session-provider; differential vs accept-invite (already minLength 12)."
expecting: "Confirm 8 vs 12 mismatch, details unused, hot-toast invisible."
next_action: "Return ROOT CAUSE FOUND to orchestrator (diagnose-only)."
bug_class: bohrbug
known_pattern_candidate: none (no knowledge-base.md)
sbfl: skipped — no failing automated test / per-test coverage for this UAT gap

reasoning_checkpoint:
  hypothesis: "Client/API password-rule split plus unmapped 400 details and an unmounted react-hot-toast Toaster cause G-01-1: invalid passwords submit with no visible error."
  confirming_evidence:
    - "signup/page.tsx validateForm and isFormReady use length < 8 / >= 8; getPasswordRequirements label is 'At least 8 characters'"
    - "validation.ts PASSWORD_REQUIREMENTS.minLength is 12; passwordSchema also requires upper, lower, number, special"
    - "signup route 400 returns { error: 'Validation failed', details: formatted Zod map }; handleTraditionalSignUp only toasts data.error and never setErrors from details"
    - "session-provider.tsx comments out react-hot-toast Toaster; mounts Sonner only; signup imports toast from react-hot-toast"
    - "accept-invite already uses length 12 in validateForm/isFormReady (differential)"
  falsification_test: "If signup client used minLength 12 and mapped details.password to errors.password, or if react-hot-toast Toaster were mounted and showed the 400, this hypothesis would be wrong."
  fix_rationale: "N/A diagnose-only — gap closure should align client rules with passwordSchema, map details to field errors, and use the mounted toast library."
  blind_spots: "Did not run a live browser submit; did not intercept a real 400. Relied on complete file reads. Phase 1 UI-SPEC explicitly said do not change password-requirement strings, which is why the 8-char widget was left as-is."
  candidate_causes:
    - "code: client minLength 8 + composition not blocking submit; 400 details not copied to field errors"
    - "code/config of app shell: react-hot-toast Toaster replaced by Sonner, so signup toast.error is invisible"
  and_gate: "yes — silent failure after submit needs both (1) client allowing API-invalid passwords through and (2) 400 having no visible surface (unmapped details AND dead hot-toast). Aligning length alone would still miss composition 400s if details stay unmapped and toast stays on the wrong library."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: On /auth/signup, invalid passwords are rejected with a visible error. Unique email creates the company; duplicate email shows duplicate copy. Password rules must be visible to the user before or after submit.
actual: No error message when password not meet the Verification
errors: None reported
reproduction: Test 1 in UAT (.planning/phases/01-company-signup-and-invites/01-UAT.md) — Credentials create-company on /auth/signup
started: Discovered during Phase 1 UAT (2026-08-29)

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: API does not validate password / returns 200 for weak passwords
  evidence: userRegistrationSchema uses passwordSchema with minLength 12 and four composition refines; route returns 400 with formatValidationErrors when validation fails.
  timestamp: 2026-08-29T10:46:00Z
- hypothesis: Signup page never renders any password-rule UI at all
  evidence: getPasswordRequirements checklist and strength meter render when formData.password is non-empty. The gap is that the checklist is advisory (does not set errors or block submit except length 8 via isFormReady) and uses 8 not 12.
  timestamp: 2026-08-29T10:46:00Z
- hypothesis: Duplicate-email 409 path also swallows password errors
  evidence: 409 is handled separately with DUPLICATE_EMAIL_COPY on the email field. Password 400s take the !response.ok branch, not 409.
  timestamp: 2026-08-29T10:46:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-08-29T10:42:00Z
  checked: .planning/debug/knowledge-base.md
  found: File does not exist. No prior resolved sessions to match.
  implication: No known-pattern shortcut; investigate from code.

- timestamp: 2026-08-29T10:43:00Z
  checked: apps/web/src/app/auth/signup/page.tsx validateForm, isFormReady, getPasswordRequirements, handleTraditionalSignUp
  found: Client password check is only empty or length < 8. isFormReady requires password.length >= 8 only. Checklist labels "At least 8 characters" and does not gate submit. On !response.ok, toast.error(data.error || 'Failed to create account') — never setErrors from data.details. Duplicate 409 does set email field error.
  implication: 8-char passwords that fail API 12/complexity pass client validation. Composition failures never become field errors. 400 relies entirely on toast.

- timestamp: 2026-08-29T10:44:00Z
  checked: apps/web/src/lib/validation.ts PASSWORD_REQUIREMENTS and passwordSchema
  found: minLength 12, requireUppercase/Lowercase/Numbers/SpecialChars all true. passwordSchema messages include "Password must be at least 12 characters" plus composition messages. userRegistrationSchema uses this schema.
  implication: API source of truth is 12 + complexity. Confirms planning note (UI 8 vs API 12).

- timestamp: 2026-08-29T10:44:00Z
  checked: apps/web/src/app/api/auth/signup/route.ts validation failure branch
  found: 400 JSON is { error: 'Validation failed', details: errors, message: 'Please check your input and try again' } where errors is Record<field, message> from formatValidationErrors.
  implication: The actual password rule text lives in details.password, not in error. UI that only reads data.error can never show the real rule.

- timestamp: 2026-08-29T10:45:00Z
  checked: apps/web/src/providers/session-provider.tsx
  found: import { Toaster } from 'react-hot-toast' is commented out. JSX Toaster is commented out. <Sonner richColors /> is mounted. Signup (and accept-invite, reset-password, forgot-password) import toast from 'react-hot-toast'. Sign-in and dashboard import toast from 'sonner'.
  implication: Signup API error toasts do not render. Combined with no field-error mapping, a 400 is visually silent — matches UAT "no error message".

- timestamp: 2026-08-29T10:46:00Z
  checked: apps/web/src/app/auth/accept-invite/page.tsx vs signup (differential)
  found: Accept-invite validateForm/isFormReady already use length 12. Signup was not updated. Both still toast via react-hot-toast and neither maps details. Accept-invite checklist still says 8 (REVIEW IN-01).
  implication: Length mismatch on signup is a known leftover; silent 400 is shared with other hot-toast pages but signup is the UAT surface.

- timestamp: 2026-08-29T10:47:00Z
  checked: 01-REVIEW.md WR-02, 01-RESEARCH.md Pitfall 9, 01-PATTERNS.md, 01-UI-SPEC.md
  found: WR-02 documents this exact defect. Research pitfall 9 warned UI 8 vs API 12. PATTERNS said do not restyle signup requirement widget strings (still shows 8). UI-SPEC: "Do not change password-requirement strings."
  implication: Phase 1 planning intentionally left the 8-char widget; the UAT gap is that leftover plus missing 400 field mapping and dead hot-toast.

- timestamp: 2026-08-29T10:48:00Z
  checked: SBFL / tests
  found: No signup page unit/e2e test files. No failing automated test for this gap.
  implication: SBFL skipped. Bohrbug confirmed by static path (same inputs always produce silent 400).

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: "Signup client validates passwords at min length 8 with advisory-only complexity, while API passwordSchema requires 12 plus composition; AND the 400 body puts the real messages in details which the page never maps to field errors, toasting only generic data.error via react-hot-toast whose Toaster is unmounted (Sonner is the only toaster)."
fix: ""
verification: ""
files_changed: []
oracle_type: specified
