import type { PlanPurpose } from "./types";
export const explainPurpose = (purpose: PlanPurpose) =>
  ({
    "regression-recovery":
      "A previously strong skill needs a refresh because recent regular typing shows repeated errors.",
    "transfer-check":
      "Your training is complete and an executable mastery check is ready.",
    "targeted-improvement":
      "Practice the focus selected from your current typing evidence.",
    "contextual-practice":
      "Practice this focus with the broader context your current learning stage calls for.",
    "general-practice":
      "Practice normally to build fluency and observe skills in regular typing.",
  })[purpose];
