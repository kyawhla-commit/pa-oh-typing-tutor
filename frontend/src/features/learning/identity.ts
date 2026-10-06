import type { ProfileStorage } from "./storage";
const guestKey = "typing-learning-guest-id:v1";
let visitGuest: string | null = null;
/** Auth ID is supplied by LearningContext, never inferred from an email/name. */
export function learnerScope(subject: string | null | undefined, learner: { name: string; email: string } | null | undefined, storage: ProfileStorage): string | null {
  if(!learner || subject === undefined) return null;
  if(subject) return `user:${subject}`;
  const email = learner.email.trim().toLowerCase();
  if(email) return `local-email:${email}`;
  // Existing guest history is one anonymous device persona, not a named account.
  try {
    let id = storage.getItem(guestKey);
    if(!id || !/^[a-f0-9-]{36}$/i.test(id)) { id = crypto.randomUUID(); storage.setItem(guestKey,id); }
    return `guest:${id}`;
  } catch { visitGuest ??= crypto.randomUUID(); return `guest:${visitGuest}`; }
}
