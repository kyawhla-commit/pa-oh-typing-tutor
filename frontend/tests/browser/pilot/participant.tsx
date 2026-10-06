import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  MemoryRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import Practice from "../../../src/features/practice/Practice";
import Test from "../../../src/features/tests/Test";
import { getLearningService } from "../../../src/features/learning/service";
import { StudyProviders } from "../../../src/features/pilot/StudyProviders";
import { createPassivePilotObserver } from "../../../src/features/pilot/observer";
import {
  studyScope,
  scopeRegistryKey,
} from "../../../src/features/pilot/fixtures";
import { pilotEventId } from "../../../src/features/pilot/recorder";
import { TASKS, isParticipantId } from "../../../src/features/pilot/tasks";
import "../../../src/index.css";
const query = new URLSearchParams(location.search),
  participantId = query.get("participant"),
  epoch = query.get("epoch"),
  taskId = query.get("task");
if (
  !isParticipantId(participantId) ||
  !epoch ||
  !TASKS.some((t) => t.id === taskId)
)
  throw Error("Participant workspace requires a valid study session.");
const registry = JSON.parse(
  localStorage.getItem(scopeRegistryKey(participantId)) ?? "null",
);
if (
  registry?.epoch !== epoch ||
  registry?.participantId !== participantId ||
  window.parent === window
)
  throw Error("Open the consented facilitator workspace first.");
const scope = studyScope(participantId, epoch);
const send = (event: unknown) =>
  window.parent.postMessage(
    { channel: "typing-pilot:v1", participantId, epoch, taskId, event },
    location.origin,
  );
const observer = createPassivePilotObserver(getLearningService(), scope, send);
let navigation = 0;
function Participant() {
  const route = useLocation().pathname,
    lastRoute = useRef<string | null>(null);
  useEffect(() => {
    if (lastRoute.current === route) return;
    lastRoute.current = route;
    send({
      eventId: pilotEventId(`navigation:${epoch}:${++navigation}`),
      eventType: "navigation",
      route: route === "/test" ? "test" : "practice",
    });
  }, [route]);
  return (
    <main className="mx-auto max-w-6xl p-4">
      <p className="mb-3 text-sm text-slate-600">
        Study workspace · Synthetic starting history is not your past
        performance.
      </p>
      <nav aria-label="Study navigation" className="mb-4 flex gap-4">
        <Link to="/practice">Practice</Link>
        <Link to="/test">Test</Link>
      </nav>
      <Routes>
        <Route path="/practice" element={<Practice />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudyProviders scope={scope} observer={observer}>
      <MemoryRouter initialEntries={["/practice"]}>
        <Participant />
      </MemoryRouter>
    </StudyProviders>
  </StrictMode>,
);
window.addEventListener("pagehide", observer.dispose, { once: true }); // subscription cleanup only; no unload event capture
