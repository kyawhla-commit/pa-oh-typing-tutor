import { EXERCISE } from "../exercises/constants";
/** Versioned product policy; all ordering is successful ingestion order. */
export const TRANSFER = Object.freeze({
  version: 1 as const, records: 64, trainingWindow: 3, transferWindow: 6,
  dedupe: 256, maxBytes: 256 * 1024,
  trainingMinimum: { grapheme: EXERCISE.grapheme.total,
    substitution: EXERCISE.substitution.expected.reduce((a,b)=>a+b,0),
    bigram: EXERCISE.bigram.total, token: EXERCISE.token.total, accuracy: 40, speed: 40 },
  trainingRate: 0.05, severeRate: 0.20, tokenSevereRate: 0.50,
  improvingSuccesses: 2, checkSuccesses: 3,
  transferMinimum: { grapheme: 40, substitution: 40, bigram: 30, token: 6, accuracy: 120, speed: 120 },
  sessionMinimum: { grapheme: 5, substitution: 5, bigram: 5, token: 1, accuracy: 40, speed: 40 },
  requiredSessions: { grapheme: 3, substitution: 3, bigram: 3, token: 2, accuracy: 3, speed: 3 },
  transferRate: 0.05, regressionRate: 0.15,
  regressionSessions: 3, severeSessions: 2, severeMinimum: 10, severeErrors: 4,
  tokenRegressionMinimum: 4, tokenRegressionErrors: 2,
  strongAccuracy: 97, poorAccuracy: 90, minActiveMs: 1000,
  speedBaselineSessions: 3, speedGain: 1.05, speedRegression: 0.90,
});
