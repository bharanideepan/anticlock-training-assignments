# Seed Quality Checklist: Dashboard Seed Enrichment

**Purpose**: Validate requirements quality for the seed enrichment spec — covering seed correctness requirements (FR-001–FR-010) and dashboard outcome requirements (SC-001–SC-006)
**Created**: 2026-06-14
**Feature**: [spec.md](../spec.md) | [research.md](../research.md)

---

## Requirement Completeness

- [ ] CHK001 Does FR-002 specify which field (`scheduledAt`) determines whether an activity falls in the "last 14 days" window, or is the queried field left implicit? [Completeness, Spec §FR-002]

- [ ] CHK002 FR-006 requires "4 activities per sales representative with `scheduledAt` in the current month" — is it documented that `getTeamPerformance()` queries `createdAt` (insert time), not `scheduledAt` (scheduled time), making `scheduledAt` irrelevant to this success criterion? [Completeness, Gap — research.md Decision 4]

- [ ] CHK003 FR-009 requires "realistic expected revenue values" but the range ($15,000–$350,000) appears only in the Key Entities section, not in the FR itself. Is the revenue range formally part of FR-009 or is it a documentation gap? [Completeness, Spec §FR-009]

- [ ] CHK004 FR-010 requires activities be "linked to existing seeded customers and contacts where available" — is there a requirement specifying what happens when no contact exists for a given customer? [Completeness, Spec §FR-010]

- [ ] CHK005 Are requirements defined for what the seed should log or output to the console so operators can confirm which records were skipped vs created? [Completeness, Gap]

---

## Requirement Clarity

- [ ] CHK006 FR-002 states "at least 14 activities … in the last 14 days" but SC-002 relaxes this to "at least 1 data point for 10 of 14 days". Are these consistent, or does FR-002 promise more than SC-002 requires? [Clarity, Conflict — Spec §FR-002 vs §SC-002]

- [ ] CHK007 The spec uses "14-day trailing window" (FR-001, FR-002, SC-002) throughout, but research confirmed the API defaults to 30 days (`getActivityTrend(days = 30)`). Is "14 days" in the spec a business requirement or a misread of the UI label? This creates ambiguity about whether 14 or 30 activities are actually sufficient. [Clarity, Ambiguity — Spec §FR-002 vs research.md Decision 1]

- [ ] CHK008 FR-008 requires idempotency via "duplicate-check logic" but does not specify the idempotency key per entity type (name for opportunities, subject+customerId+type for activities, title for tasks). Is the key definition documented anywhere in the spec? [Clarity, Spec §FR-008]

- [ ] CHK009 FR-006 says "4 activities per sales representative" — does this mean 4 per each rep (multiplied by the number of reps) or 4 total distributed across reps? [Clarity, Ambiguity — Spec §FR-006]

- [ ] CHK010 SC-004 requires "at least 1 activity logged per sales rep for the current month" — is "logged" defined as the activity's `createdAt` date or `scheduledAt` date? The distinction matters because these are different fields queried by different services. [Clarity, Ambiguity — Spec §SC-004]

---

## Requirement Consistency

- [ ] CHK011 The spec's Assumptions section states "Today's date is used as the reference point for 'this month' and 'last 14 days'" while FR-001 says "last 14 days". Are these consistent with the actual 30-day service default confirmed in research? [Consistency, Spec §Assumptions vs §FR-001]

- [ ] CHK012 SC-001 lists "New This Month ≥ 3" as a success criterion, but FR-001–FR-010 contain no corresponding functional requirement to seed customers with `createdAt` in the current month. Is this success criterion backed by a functional requirement? [Consistency, Spec §SC-001 vs §FR-001–010]

- [ ] CHK013 The Key Entities section lists "Activity (enriched): 14+ records" but FR-002 and the research both confirm 30 activities are needed for the 30-day window. Is the Key Entities count inconsistent with the implementation target? [Consistency, Spec §Key Entities vs §FR-002 and research.md Decision 1]

---

## Acceptance Criteria Quality

- [ ] CHK014 SC-006 states "Running the seed in any calendar month produces a visually populated dashboard" — is "visually populated" defined with measurable thresholds, or does it merely restate SC-001 through SC-004 without adding a new verifiable criterion? [Measurability, Spec §SC-006]

- [ ] CHK015 SC-003 requires "non-zero won revenue in at least 4 of the last 6 months" — is there a requirement specifying the minimum revenue value that constitutes "non-zero" (i.e., is $1 acceptable)? [Measurability, Spec §SC-003]

- [ ] CHK016 SC-005 requires the seed to complete in under 30 seconds — is there a corresponding requirement specifying the test conditions (cold DB, warm DB, number of existing records) under which this threshold applies? [Measurability, Spec §SC-005]

---

## Scenario Coverage

- [ ] CHK017 The Edge Cases section addresses re-seeding in a different month and mid-month seeding. Are requirements defined for what happens if the seed is run against a database that has been partially seeded (some new records exist, others do not)? [Coverage, Spec §Edge Cases]

- [ ] CHK018 Are requirements defined for the case where referenced entities (e.g., a customer or pipeline stage) are missing from the database — should the seed fail loudly, skip silently, or create the missing dependency? [Coverage, Gap]

- [ ] CHK019 The spec explicitly excludes file attachments (Assumptions) but does not address whether new audit log entries should be created for the enrichment records. Is the absence of audit log requirements intentional? [Coverage, Spec §Assumptions]

---

## Dependencies & Assumptions

- [ ] CHK020 The spec assumes "The existing 002-database-seed data is already applied" — is there a documented validation step or precondition check that confirms this before the enrichment seed runs? [Assumption, Spec §Assumptions]

- [ ] CHK021 Research Decision 4 establishes that Team Performance counts `activity.createdAt`, not `scheduledAt`. Is this constraint captured as a documented assumption or requirement in the spec, or does it live only in research.md? [Assumption, Gap — research.md Decision 4]

---

## Notes

- Items marked `[Conflict]` identify places where two spec sections make contradictory claims — resolve before treating the spec as final
- Items marked `[Ambiguity]` require a single canonical answer to be substituted into the spec
- Items marked `[Gap]` identify requirements that exist in the implementation or research but are missing from the spec
- CHK007 is the highest-risk item: the "14 vs 30 day" discrepancy affects whether FR-002 and SC-002 are sufficient or undershooting
- Check items off as completed: `[x]`
