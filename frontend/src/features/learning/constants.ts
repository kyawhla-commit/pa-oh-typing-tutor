/** Initial, adjustable product policy; not statistical confidence or trained weights. */
export const LEARNING = Object.freeze({
  version: 1 as const,
  recentSessions: 8, dedupeSessions: 256,
  graphemes: 96, substitutions: 64, bigrams: 96, tokens: 48,
  mistakeExamples: 32, maxGraphemeUnits: 32, maxTokenUnits: 32, maxIdentityUnits: 128,
  maxProfileBytes: 2 * 1024 * 1024,
  recommendations: 3,
  grapheme: { opportunities: 20, errors: 3, rate: 0.15, lifetimeOpportunities: 40, lifetimeErrors: 6 },
  bigram: { opportunities: 20, errors: 4, rate: 0.20, lifetimeOpportunities: 40, lifetimeErrors: 8 },
  token: { opportunities: 5, errors: 3, rate: 0.30, lifetimeOpportunities: 10, lifetimeErrors: 4 },
  substitution: { opportunities: 20, recentCount: 4, lifetimeCount: 6 },
  improvement: { opportunities: 20, rate: 0.05 },
  poorAccuracy: 90, strongAccuracy: 97, trendSessions: 3, trendAttempts: 40, trendMinActiveMs: 1000, broadGraphemes: 5, broadErrorsPerGrapheme: 2,
  priority: { rate: 1000, errors: 2, recentErrors: 3, remainingErrors: 2, errorCap: 50, recentCap: 25, remainingCap: 20 },
  categoryBonus: { substitution: 30, grapheme: 20, bigram: 10, token: 0 },
  focusPriority: 2000, speedPriority: 1000, maxScopeUnits: 512,
  exerciseGraphemes: 120,
});
