import type { CSSProperties } from "react";
import { Hand } from "lucide-react";
import type { KeyHint } from "../keyboardLayouts";
import { fingerColors, fingerGuidance } from "./fingerMapping";
import "./glass-hand-guide.css";

export function HandGuideToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={enabled} aria-label="Show Hand Guide"
    className="hand-guide-toggle" onClick={() => onChange(!enabled)}>
    <Hand size={17} aria-hidden="true" />
    <span>Show Hand Guide</span>
    <span className="hand-guide-toggle-track" aria-hidden="true"><span /></span>
  </button>;
}

export function FingerInstruction({ nextKey, composing = false }: { nextKey: KeyHint | null; composing?: boolean }) {
  const guidance = fingerGuidance(nextKey);
  return <div className="finger-instruction" data-testid="finger-instruction">
    <p className="finger-instruction-caption">Use finger</p>
    <p className="finger-instruction-name" data-testid="finger-name">
      {guidance && <span className="finger-color-dot" aria-hidden="true" style={{ "--finger-color": guidance.finger.color } as CSSProperties} />}
      {guidance ? guidance.finger.label : composing ? "Finish composition" : "Follow your input method"}
    </p>
    {guidance && <p className="finger-instruction-detail">
      {guidance.shiftFinger ? `Hold ${guidance.shiftCode === "ShiftLeft" ? "left" : "right"} Shift with your ${guidance.shiftFinger.label.toLowerCase()}.`
        : guidance.finger.kind === "thumb" ? "Either thumb can press Space." : `Use your ${guidance.finger.label.toLowerCase()}.`}
    </p>}
  </div>;
}

export function FingerColorLegend() {
  return <div className="finger-color-legend" aria-label="Finger colors">
    {Object.entries(fingerColors).map(([kind, color]) => <span key={kind}>
      <i className="finger-color-dot" aria-hidden="true" style={{ "--finger-color": color } as CSSProperties} />
      {kind === "little" ? "Little" : kind[0].toUpperCase() + kind.slice(1)}
    </span>)}
  </div>;
}
