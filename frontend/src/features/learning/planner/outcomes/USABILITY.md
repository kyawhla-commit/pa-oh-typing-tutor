# Future real-learner usability study (not conducted)

Slice 12 has zero human participants. Automated interactions and synthetic seeded results verify engineering behavior; they do not establish understandability, reduced anxiety, learning efficacy, or optimal policy calibration. There is no telemetry collector or analytics SDK.

Propose one moderated pilot with 6–8 consenting adult learners, varying typing experience and English/Pa’O familiarity. Confirm language accessibility with participants before assigning tasks; the current adaptive English bank and neutral Unicode drills are not fluent Pa’O teaching material. Include keyboard-only participants where feasible. Recruit voluntarily, explain the prototype and synthetic starting profile, and make withdrawal possible without affecting their learning account. Use an isolated study profile, never private custom passages or authentication information. Obtain separate consent before recording any audio/video; default to brief manual notes. Assign a random study pseudonym, limit access to the research team and agree a short retention/deletion period before collection.

Each 30–40 minute session starts with a neutral orientation (“choose how you want to practice”), followed by think-aloud tasks. Counterbalance skip and cancel tasks so an explanation from the first does not teach the second. The moderator observes without explaining controls until the participant acts or requests help; record help separately from unassisted success.

1. Find Session focus, explain in their own words why this activity is offered, and begin it.
2. Decline the next recommendation before starting, then choose another available activity or normal Practice.
3. Start a recommendation, type part of it, change their mind and leave it.
4. Complete a primary activity, identify the optional supporting activity, and finish without doing it.
5. In a prepared eligible profile, interpret “Mastery Check”, start and complete it; ask about anticipated consequences before showing the result.
6. Complete primary and supporting Practice and explain whether further work is required.
7. Navigate away during partial typing, return, then reload an offer; describe what they expect to remain.

Record task completion (unassisted / assisted / unsuccessful), first action, wrong clicks, hesitation/confusion, time to meaningful action and short volunteered comments. Use manual timing/notes only. Do not score the participant or imply that Skip/Cancel is a failure. For the pilot, report descriptive counts and examples rather than generalizing small-sample averages as efficacy evidence.

Ask after the tasks:

- What does Session focus mean, and was its reason clear?
- How are Skip and Cancel different? What do you think each does to progress?
- Did Mastery Check create pressure, anxiety or uncertainty?
- Was the supporting activity clearly optional? Is a two-activity maximum acceptable?
- Did the flow feel controlling? When would you prefer normal Practice?
- Were explanations useful or repetitive?
- Could you recover comfortably after changing your mind?

Success criteria to agree before recruitment: learners can distinguish Skip/Cancel and optional continuation without coaching; no participant believes skipping/cancelling records a failed assessment; controls can be located and used with their normal input method. Treat misunderstandings as design findings, not learner faults. Revise wording/focus/navigation from observed evidence, then repeat the pilot before expanding scope. Policy efficacy, Pa’O content quality and future scheduling require separate studies.

## Proposed future event boundary — documentation/type only

`FuturePlannerOutcomeEvent` in `analytics.ts` contains optional consented random study ID, local sequence, offered action type, optional weakness category, started/completed/skipped/cancelled outcome, whether an alternative existed and plan purpose. It excludes raw text/input/passages, exact weakness items, email, source identity, IP, tokens and timestamped activity trails. There is no sink, emitter, network call or production export. Any later collection needs explicit consent, retention/access rules and a separately approved design; the type does not authorize transmission.
