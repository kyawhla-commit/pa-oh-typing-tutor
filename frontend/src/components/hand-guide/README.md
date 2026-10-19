# Glass hand guide

`TypingKeyboardFeedback` consumes the existing `nextGuideKey(snapshot, layout)`. That resolver already handles verified QWERTY and Pa-Oh outputs, remaining combining marks, mistakes/Backspace, and completion. Composition drafts suppress physical hints. No typing-engine code or character maps are changed.

`fingerMapping.ts` assigns physical codes to standard touch-typing fingers. Space recommends the right thumb and explains that either thumb is valid. Shift uses the opposite hand's little finger. Unknown input methods receive text guidance without guessed finger assignments.

`GlassHandGuide` renders one local glass-hand image as separately clipped palm and finger regions, mirrored for the right hand. Rotation around each knuckle and scaling along the finger's length fit its tip to a measured key while preserving its width and palm connection; artwork coordinates describe the anatomy, not browser positioning. `ResizeObserver` watches the keyboard and keys, with window resize and font-load handling. Measurements account for scaling and local offsets. Active fingers reach their expected keys over 280 ms and stay there until the typing state advances. For example, `ယ` moves the left index finger to B and the right little finger to Shift; the following `လ` moves that index finger to V. Inactive fingers return home. Reduced motion and keyboard widths below 560 px place fingers directly at their destinations without animation. The entire decoration is inaccessible to pointer events and hidden from assistive technology.

The keyboard keeps its existing rows, sizes, hit targets, and pressed/error feedback. Permanent wrist clearance and a fixed footer prevent bottom-of-page scroll jumps when the guide is switched off. When off, artwork, animations, finger text, and observers are unmounted; ordinary next-key hints remain.

Active practice and mistake drills group their paragraph and keyboard in one `.practice-workspace`. The reading panel stays pinned at the top of the page's scrolling area, while its existing internal scrolling follows the current typing position. Keyboard width is capped according to viewport height so the hands leave room for the paragraph; taller windows use the full keyboard width. Status, instructions, and restart controls remain accessible by scrolling. Completed sessions and the hidden-keyboard view retain the normal reading layout.

`showHandGuide` defaults to true in `LearningContext`, merges into existing stored preferences, and persists per local learner/account cache. Cloud hydration retains this device preference. It is intentionally device-local: no Supabase schema migration is needed. Practice and mistake drills share it. Saving Settings preserves the current hand-guide setting.

## Verification

- `fingerMapping.test.ts`: finger zones, every verified layout output, modifiers, unsupported codes.
- `handGeometry.test.ts`: rendered centres, offset/scaling invariance, unavailable layout.
- `GlassHandGuide.integration.test.tsx`: live typing, combining marks, Shift, correction, IME drafts, completion, disabled guide, observer cleanup, resize, reduced motion, pointer-event decoration, and finite finger animations.
- `HandGuidePreferences.integration.test.tsx`: default, stored preference, migration, remount persistence, and session stability.
- Existing Practice tests now use deterministic Latin fixtures where their assertions require Latin; progress tests cover both Latin and Pa-Oh using the engine's grapheme units. The prior code-unit assertion also failed in an untouched HEAD checkout.

Executed on 2026-10-18:

- `npm test -- src/components src/features/typing src/features/practice src/engine/typing src/features/tests --maxWorkers=2`: 20 files and 382 tests passed.
- `npm run build` and `npm run typecheck`: passed.
- `npm test -- --maxWorkers=4`: 1,110 tests passed; the learning evaluation suite hit its 180-second setup timeout, leaving its 118 tests skipped in that run.
- `npm test -- src/features/learning/evaluation/evaluation.test.ts --maxWorkers=1`: the evaluation suite passed all 118 tests on its isolated rerun. This was not a second full-suite run.
- `git diff --check`: passed. The typing engine and keyboard legend definitions have no changes.
- Browser checks at 320, 390, 1024, and 1440 px: no horizontal page overflow, all 54 keys retained, aligned hands, accessible spacebar, keyboard-operated toggle, stable keyboard position when toggling, narrow-screen motion suppression, and light/dark rendering.

After the follow-up to redirect the fingers to `ယ`, the four guide/preference test files passed all 44 tests. New assertions verify exact fingertip placement on B and opposite Shift, resizing, progression to V, and returning home on completion. A browser preview of the actual components confirmed the held pose and the `ယ` → `လ` transition.

After the paragraph visibility fix, the practice, typing surface, hand guide, and passage-scrolling suites passed all 111 tests across six files; build and typecheck also passed. At the browser's 1280 × 720 viewport, the pinned paragraph, complete keyboard, and hands were visible together at the bottom of the page. Additional viewport overrides timed out, so this follow-up does not claim fresh visual checks at other sizes.

Browser checks use ordinary desktop viewport resizing, not a device emulator. No physical-device testing was performed. The artwork is a lightweight 2D composite with a 3D appearance; it does not simulate physical refraction or individual finger joints. Distant reaches rotate and stretch the artwork around the knuckle.

## Files changed

- Added this `hand-guide/` directory: `GlassHandGuide.tsx`, `HandGuideControls.tsx`, `fingerMapping.ts`, `handGeometry.ts`, `glass-hand-guide.css`, three test files, and these notes.
- Added `src/assets/hand-guide/glass-left-hand.png` and its `PROMPT.md` provenance.
- Updated `src/components/VirtualKeyboard.tsx` and `virtual-keyboard.css` for physical key identifiers, matching colors, and a measured decorative overlay.
- Updated `src/features/typing/TypingPracticeSurface.tsx`, `CompactMyanmarTypingGuide.tsx`, and `typing-layout.css` for controls and finger instructions; added `HandGuidePreferences.integration.test.tsx`.
- Updated `src/data/LearningContext.tsx`, `src/features/settings/Settings.tsx`, and `src/features/pilot/StudyProviders.tsx` for preference defaults, persistence, and compatibility.
- Updated `src/features/practice/Practice.tsx` and `MistakeReview.tsx` to share the preference; corrected deterministic fixtures and grapheme assertions in `Practice.integration.test.tsx`.

The typing engine, keyboard legend definitions, routes, lessons, scoring, and package dependencies are unchanged.

## Artwork

The generated asset is `src/assets/hand-guide/glass-left-hand.png` (1024 × 1536 RGBA). It was created with the built-in image generation tool. Its prompt and refinement are recorded in `src/assets/hand-guide/PROMPT.md`. SVG clipping removes the surrounding image halo and gives independent control of each finger. No runtime graphics dependency was added.
