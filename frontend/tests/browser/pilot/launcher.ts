import { pilotEnabled } from "../../../src/features/pilot/tasks";
if (pilotEnabled(import.meta.env.DEV, import.meta.env.MODE))
  void import("./facilitator").then((module) => module.mountPilot());
else
  document.getElementById("root")!.textContent =
    "Pilot mode is disabled. Use the explicit local pilot development command.";
