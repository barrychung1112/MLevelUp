# Mainline and Daily Mission Design

**Date:** 2026-07-18  
**Status:** Approved for implementation planning

## Goal

Simplify onboarding and replace the current daily quest model with a disciplined dual-track training system:

- one multi-day mainline mission;
- one independent daily mission with a 24-hour deadline;
- measurable checkpoints and evidence;
- corrective penalty missions for missed obligations;
- a seven-day failure review followed by an optional 72-hour recovery window;
- a resource-readiness gate that prevents unsupported missions from being assigned.

## 1. Simplified onboarding

The onboarding screen asks one question:

> 你想要成為什麼？

The only available target is `機器學習工程師`. It is presented as a selected target card rather than a dropdown. The user confirms with `開始挑戰`.

The interface removes difficulty and time controls. Internal defaults are:

- `targetRole = machine-learning-engineer`;
- `dailyMinutes = 300`;
- difficulty is selected automatically from demonstrated ability and performance.

## 2. Mission structure

### 2.1 Mainline mission

A mainline mission is a complete ML engineering project lasting multiple days. It remains active until completed, abandoned, or reset.

Each mainline mission has:

- a concrete objective;
- a final portfolio artifact;
- an estimated duration in days;
- three to five project stages;
- one planned checkpoint per active day;
- measurable acceptance criteria for every checkpoint;
- required evidence for every checkpoint.

A normal day allocates approximately four hours to the planned mainline checkpoint.

### 2.2 Daily mission

One independent daily mission is assigned each normal training day. It should take 30 to 60 minutes and must produce verifiable evidence.

The deadline is exactly 24 hours after assignment. An incomplete mission becomes `expired` when the deadline passes.

### 2.3 Penalty mission

A penalty mission is generated when either:

- the planned mainline checkpoint is not completed by its daily deadline; or
- a daily mission expires.

Each violation creates one focused penalty mission. At most two new penalty missions can be created per day: one from the mainline checkpoint and one from the daily mission.

Penalty missions:

- take 30 to 60 minutes;
- are additional to the normal five-hour workload;
- target the cause of failure;
- award no XP or skill growth;
- remain outstanding until completed.

## 3. Mission clarity contract

Every checkpoint, daily mission, and penalty mission must contain:

- `objective`: why the work matters;
- `deliverable`: the exact output to submit;
- `executionSteps`: three to seven concrete actions;
- `successMetrics`: objective pass/fail conditions;
- `evidenceRequirements`: URLs, files, metrics, screenshots, or written evidence;
- `estimatedMinutes`;
- `dueAt`;
- `outOfScope`: what the user is not expected to do.

Vague assignments such as `學習模型評估` are invalid. A valid equivalent specifies the models, validation method, metrics, error analysis, evidence, and written conclusion.

## 4. Resource-readiness gate

A mission cannot be assigned unless the system confirms that the user has suitable resources to complete it.

Each assignable mission requires:

- one primary resource and no more than three total recommended resources;
- resources that directly support specific execution steps;
- accessible source data or a documented substitute;
- explicit prerequisites and required accounts or tools;
- cost and hardware requirements compatible with the product's allowed limits;
- a fallback resource for critical external links;
- resource time included in the mission's time estimate.

The resource check evaluates:

- URL availability;
- relevance to the execution steps;
- credibility;
- freshness where it materially affects completion;
- difficulty fit;
- language accessibility;
- estimated learning time;
- required environment, including Python, GPU, Kaggle, cloud, or deployment accounts.

The assignment gate is:

```text
clear steps
+ measurable success criteria
+ submit-ready evidence
+ obtainable data and tools
+ acceptable cost and hardware
+ at least one suitable resource
= assignable mission
```

If the gate fails, the system must not assign the mission. It selects another mission whose resource check passes. Generated summaries may supplement a qualified resource but cannot replace the minimum resource requirement.

Mainline checkpoints may use different resources. Penalty missions must use resources that address the recorded failure reason.

## 5. Workload rules

A normal training day targets five hours:

- approximately four hours for the mainline checkpoint;
- approximately one hour for the daily mission.

Penalty missions are outside the five-hour allocation. The system displays normal workload and penalty workload separately.

## 6. Failure and recovery state machine

A failure day occurs when at least one of the following is overdue:

- the day's planned mainline checkpoint;
- the daily mission's 24-hour deadline.

Seven consecutive failure days change the training state to `failure_review`. The system asks whether the user wants to abandon or continue the challenge.

### 6.1 Abandon

Abandoning resets:

- level and XP;
- all seven skill scores;
- streak and failure counters;
- mainline progress;
- active daily and penalty missions;
- in-progress assignment state.

The Supabase Auth identity remains so the same email can sign in again. Submitted real artifacts remain archived and do not restore XP or skill scores. Training restarts from `挑戰的勇氣`.

### 6.2 Continue and recover

Continuing starts a 72-hour recovery window:

- no new mainline checkpoints;
- no new daily missions;
- no new penalty missions;
- only existing checkpoint, daily, and penalty debt is shown;
- an exact recovery deadline is displayed.

If all required debt is completed before the deadline, the training state returns to normal and consecutive failure days reset to zero.

If any required debt remains when the deadline passes, the system automatically applies the same training reset as abandonment and returns the user to `挑戰的勇氣`.

## 7. Data model changes

Extend `profiles` with:

- `target_role`;
- `daily_minutes`, fixed to 300 for this version;
- `consecutive_failure_days`;
- `training_status`: `normal | failure_review | recovery`;
- `recovery_started_at`;
- `recovery_deadline`.

Extend `quests` with:

- `quest_scope`: `main | daily | penalty | calibration`;
- `duration_days`;
- `execution_steps` as JSON;
- `success_metrics` as JSON;
- `out_of_scope` as JSON.

Extend `quest_assignments` with:

- `parent_assignment_id`;
- `checkpoint_index`;
- `due_at`;
- `expired_at`;
- `penalty_source_assignment_id`.

Reuse the existing quest, assignment, submission, feedback, and artifact pipelines. Do not create separate persistence systems for each mission scope.

## 8. Processing model

The MVP does not require a background scheduling service.

Deadline and state reconciliation runs:

- when Dashboard loads;
- after a submission;
- after a user confirms the failure-review choice.

All timestamps are stored in UTC and displayed in the user's timezone. Reconciliation commands must be idempotent so refreshes cannot duplicate daily or penalty assignments.

AI may later generate mission content, but deterministic application rules own deadlines, expiry, penalties, recovery, and reset behavior.

## 9. UI changes

The Dashboard presents three distinct areas:

1. `主線任務`: project progress, today's checkpoint, final artifact, and stage timeline.
2. `每日任務`: independent mission with an exact 24-hour countdown.
3. `懲罰任務`: additional workload, source violation, and outstanding count.

During recovery, normal mission areas are replaced by a recovery console showing the 72-hour countdown and all remaining debt.

## 10. Error handling and safety

- Assignment generation fails closed when the resource-readiness gate cannot pass.
- Missing or unavailable resources cause reselection, not an unsupported assignment.
- Deadline reconciliation is idempotent.
- Reset operations require explicit confirmation except for an expired 72-hour recovery window.
- Automatic reset records an immutable audit event before clearing active training state.
- Authentication identity and archived artifacts are never deleted by a training reset.

## 11. Acceptance criteria

The feature is complete when:

- onboarding has one fixed career target and no time or difficulty input;
- a user receives one multi-day mainline mission and one 24-hour daily mission;
- the mainline mission exposes three to five measurable checkpoints;
- every assigned mission passes the resource-readiness gate;
- missed mainline and daily obligations generate the correct penalty missions once;
- seven consecutive failure days open failure review;
- continuing starts a 72-hour no-new-work recovery window;
- recovery success restores normal assignment;
- recovery failure automatically resets training progress while preserving Auth identity and archived artifacts;
- mock and Supabase repositories produce equivalent state transitions;
- unit, integration, production build, and desktop/mobile E2E tests pass.
