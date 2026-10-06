import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useLearningData } from "../../data/LearningContext";
import type { TypingSession } from "../typing/useTypingSession";
import { learnerScope } from "./identity";
import { getLearningService, type LearningService } from "./service";
import { emptyProfile } from "./profile";
import type { LearningSnapshot } from "./service";
import { emptyMastery,type AdaptiveAttribution } from "./transfer";
const unavailable: LearningSnapshot = { profile: emptyProfile(),mastery:emptyMastery(),persisted: false };
const browserStorage = { getItem: (key: string)=>window.localStorage.getItem(key),setItem: (key: string,value: string)=>window.localStorage.setItem(key,value) };
export function useLearningScope() {
  const { learner,authenticatedUserId } = useLearningData();
  return useMemo(()=>learnerScope(authenticatedUserId,learner,browserStorage),[authenticatedUserId,learner?.email,!!learner]);
}
export function useLearningProfile(scope: string | null, service = getLearningService()) {
  const subscribe = useCallback((listener: ()=>void)=>scope ? service.subscribe(scope,listener) : ()=>{},[scope,service]);
  const snapshot = useCallback(()=>scope ? service.getSnapshot(scope) : unavailable,[scope,service]);
  return useSyncExternalStore(subscribe,snapshot,snapshot);
}
// Ownership survives hook remount while its feature session remains live. Dedupe
// is separate and persisted in the profile, not inferred from this WeakMap.
const ownership = new WeakMap<TypingSession,{ id: string; scope: string | null; started: boolean; attribution?: AdaptiveAttribution }>();
export function useSessionLearning(session: TypingSession,scope: string | null,service: LearningService = getLearningService(),attribution?: AdaptiveAttribution) {
  const currentScope = useRef(scope); currentScope.current=scope;
  const currentAttribution = useRef(attribution); currentAttribution.current=attribution;
  useEffect(()=> {
    const handle = () => {
      const run=session.run.getSnapshot(); let owner=ownership.get(session);
      if(!owner || owner.id!==run.id) {
        owner={id:run.id,scope:currentScope.current,started:run.status!=="ready",attribution:currentAttribution.current}; ownership.set(session,owner);
      } else if(!owner.started) {
        owner.scope=currentScope.current; owner.attribution=currentAttribution.current; owner.started=run.status!=="ready";
      }
      if(run.result) service.complete(owner.scope,run.id,run.result,Date.now(),owner.attribution);
    };
    const unsubscribe=session.run.subscribe(handle);handle();
    return unsubscribe;
  },[session,service]);
}
