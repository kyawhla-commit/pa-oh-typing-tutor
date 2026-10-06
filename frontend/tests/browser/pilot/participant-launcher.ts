import { pilotEnabled } from "../../../src/features/pilot/tasks";
if (pilotEnabled(import.meta.env.DEV, import.meta.env.MODE))
  void import("./participant");
else document.getElementById("root")!.textContent = "Pilot mode is disabled.";
