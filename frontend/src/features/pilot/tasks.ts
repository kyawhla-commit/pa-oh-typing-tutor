export const STUDY_VERSION = 1 as const;
export const TASKS = Object.freeze([
  {
    id: "T01",
    title: "Ordinary Practice",
    prompt: "Start a normal typing practice.",
    criterion: "Find ordinary Practice and begin typing without help.",
    fixture: "no-weakness",
  },
  {
    id: "T02",
    title: "Recommended Practice",
    prompt: "Choose what the app recommends you do next.",
    criterion:
      "Describe the general recommendation reason and launch it without explanation.",
    fixture: "active",
  },
  {
    id: "T03",
    title: "Skip",
    prompt: "Suppose you don’t want to do this exercise right now.",
    criterion:
      "Decline the offer and understand that skill progress was not penalized.",
    fixture: "active",
  },
  {
    id: "T04",
    title: "Cancel",
    prompt: "Now stop this exercise before finishing it.",
    criterion:
      "Stop a started activity and distinguish this from Skip without assuming a learning failure.",
    fixture: "active",
  },
  {
    id: "T05",
    title: "Adaptive progression",
    prompt: "Try the next practice and describe how it differs.",
    criterion:
      "Recognize differences between concentrated, contextual and mixed practice; subjective quality is recorded, not scored as efficacy.",
    fixture: "active",
  },
  {
    id: "T06",
    title: "Mastery Check",
    prompt: "Continue with the app recommendation.",
    criterion:
      "Explain that the check examines recent improvement, is not a permanent final exam, and can be declined.",
    fixture: "assessment-eligible",
  },
  {
    id: "T07",
    title: "Optional Secondary",
    prompt: "Complete this practice, then explain the choices before choosing.",
    criterion:
      "Identify Continue as optional supporting practice and Finish as ending here.",
    fixture: "active",
  },
  {
    id: "T08",
    title: "Change Mind",
    prompt:
      "Decline one activity, return later, then stop another activity partway through.",
    criterion:
      "Recover from changing their mind and find the next explicit action.",
    fixture: "active",
  },
  {
    id: "T09",
    title: "Timed Test",
    prompt: "Run a short timed typing test.",
    criterion: "Find a short Test and explain its distinction from Practice.",
    fixture: "no-weakness",
  },
  {
    id: "T10",
    title: "Result Interpretation",
    prompt: "What do you think the app wants you to practice next, and why?",
    criterion:
      "Explain the general recommendation reason in their own words without coaching.",
    fixture: "improving",
  },
] as const);
export type TaskId = (typeof TASKS)[number]["id"];
export const CONFUSION_TAGS = Object.freeze([
  "recommendation-purpose",
  "session-focus",
  "skip-vs-cancel",
  "mastery-check",
  "completion",
  "secondary-activity",
  "navigation",
  "progress-display",
  "wording",
  "content-quality",
] as const);
export const FIXTURES = Object.freeze([
  "no-weakness",
  "active",
  "improving",
  "mixed",
  "transfer-check",
  "assessment-eligible",
  "regressed",
] as const);
export type FixtureId = (typeof FIXTURES)[number];
export function pilotEnabled(dev: boolean, mode: string) {
  return dev && mode === "pilot";
}
export const isParticipantId = (id: unknown): id is string =>
  typeof id === "string" && /^P(?:0[1-9]|[1-9][0-9])$/.test(id);
