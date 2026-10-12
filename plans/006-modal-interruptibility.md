# 006 — Make modal open/close interruptible and reversible

- **Status**: TODO
- **Commit**: 7c0b6ca
- **Severity**: HIGH
- **Category**: Interruptibility (4)
- **Estimated scope**: 2 files, ~30 lines

## Problem

The house modal entrance is a **keyframe animation on a conditionally-rendered element**:

```css
/* app/globals.css:194-198 — current */
@keyframes modal-panel-in {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
.modal-panel-in { animation: modal-panel-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
```

It is applied to panels that mount and unmount on a boolean, so:

```tsx
{/* app/dashboard/page.tsx — current */}
{fullViewSection && (        // :984
  …className="modal-panel-in" …   // :1036
)}
{showMembers && (            // :1052
  …className="modal-panel-in" …   // :1108
)}
{showBriefing && (           // :1158
  …className="modal-panel-in" …   // :1187
)}
```

Three consequences, all from AUDIT §4 ("CSS **transitions** retarget from the current state mid-animation; **keyframes** restart from zero"):

1. **Closing is a 0ms cut.** React unmounts the node, so there is no exit at all — a 500ms entrance followed by an instant disappearance.
2. **The open cannot be interrupted.** Clicking Back or the backdrop mid-entrance drops the panel instantly rather than reversing from its current position.
3. Because it is an `animation`, the entrance always plays from `translateY(14px) scale(0.985)` — it cannot be re-targeted.

This is the highest-leverage remaining finding: the full-view modal is opened many times a day, and every close is a hard cut.

## Target

Convert the keyframe animation into a **transition** driven by a mounted flag, so open and close both animate and both are interruptible.

**1. Replace the keyframe with transition-ready state classes** in `app/globals.css`:

```css
/* app/globals.css:194-198 — target */
.modal-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
  transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.modal-panel[data-open="true"] {
  opacity: 1;
  transform: translateY(0) scale(1);
}
```

Keep the duration and curve **identical** to the current animation (0.5s, `cubic-bezier(0.22, 1, 0.36, 1)`) so the entrance looks unchanged.

**2. Add a mount-latch in `app/dashboard/page.tsx`** so the element stays in the DOM long enough to animate out. The repo already has an `isNarrow` `useEffect` pattern at `app/dashboard/page.tsx:129-134` to imitate.

```tsx
{/* app/dashboard/page.tsx — target: one latch per modal */}
const [membersOpen, setMembersOpen] = useState(false);   // replaces showMembers
const [membersMounted, setMembersMounted] = useState(false);

useEffect(() => {
  if (membersOpen) {
    setMembersMounted(true);
    return;
  }
  const t = window.setTimeout(() => setMembersMounted(false), 500); // match the transition
  return () => window.clearTimeout(t);
}, [membersOpen]);
```

Then render on the latch, not the boolean:

```tsx
{/* target */}
{membersMounted && (
  <div className="modal-panel" data-open={membersOpen} …>
```

**3. Reduce the transform, not just remove it, under reduced motion.** Plan 004 owns the media query; if it has landed, add `.modal-panel { transform: none; }` alongside its other reduced-motion rules. Do not duplicate that block here.

## Repo conventions to follow

- The repo already tracks "is the browser in this state" with `useState` + `useEffect` + a listener — see `app/dashboard/page.tsx:129-134`. Use that shape for the latch.
- `components/CalendarView.tsx:228` shows the same conditional-mount modal pattern; it is handled by plan 007, not here.

## Steps

1. `app/globals.css` — replace lines 194-198 (`@keyframes modal-panel-in` and `.modal-panel-in`) with the two `.modal-panel` / `.modal-panel[data-open="true"]` rules from **Target**. Delete the `@keyframes modal-panel-in` block entirely.
2. `app/globals.css:200-202` — the existing reduced-motion rule references `.modal-panel-in`. Update it to target `.modal-panel` and set `transition: none` (plan 004 will extend this block; keep it valid in the meantime).
3. `app/dashboard/page.tsx` — convert the three modals (`fullViewSection` at :984, `showMembers` at :1052, `showBriefing` at :1158) to the latch pattern from **Target**. Each needs its own open-state and mounted-state pair.
4. `app/dashboard/page.tsx` — change each panel's `className="modal-panel-in"` (at :1036, :1108, :1187) to `className="modal-panel"` and add `data-open={open}`.
5. Confirm the close path still works: every existing `setShowMembers(false)` etc. must become a setter for the *open* state only. The latch handles unmounting. **Do not** add timers at the call sites.

## Boundaries

- Do NOT change the duration (0.5s) or the curve (`cubic-bezier(0.22, 1, 0.36, 1)`) — the entrance must look identical.
- Do NOT change any modal's inner layout, content, or the `zoom: 1.25`.
- Do NOT touch `AddModal`, `ContentSection`, `CheckInView`, `CalendarView`, or `RecordsSection` — plan 007 owns those.
- Do NOT introduce a state-management library or `framer-motion`/`motion` for this.
- Do NOT add mount latches to any element that is not one of the three named modals.
- If the cited lines do not match, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic checks**:
  ```bash
  grep -n "modal-panel-in" app/globals.css app/dashboard/page.tsx   # expect 0 matches
  grep -n "data-open" app/dashboard/page.tsx                        # expect 3 matches
  ```
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm:
  - Opening a bento full-view card still slides up ~14px with the same 500ms feel as before.
  - **Closing now animates** — press Back and watch the panel slide back down and fade, rather than vanish.
  - Click Back **mid-entrance** (within the first ~200ms): the panel must reverse from wherever it is, with no jump.
  - Spam the backdrop open/close 5× rapidly. The panel must follow the clicks smoothly with no flicker, no double-mount, and no stuck-invisible panel.
  - Open the Your Team modal, then switch sub-tabs — the panel must stay mounted and NOT replay its entrance (see plan 009 for why the tab body still snaps).
  - DevTools → Animations at 10%: confirm the panel is driven by a `transition` (listed under Transitions), not a keyframe animation.
- **Done when**: `modal-panel-in` is gone, all three modals animate both ways, and rapid open/close never leaves a stuck panel.

## Highest-risk regression

A wrong latch timeout (`< 500ms`) truncates the exit; a missing cleanup leaves a modal permanently in the DOM and intercepting clicks. After the feel check, confirm in the Elements panel that the modal node is **removed** from the DOM once closed.
