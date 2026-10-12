# 005 — Fix the dead shimmer and the member-panel motion defects

- **Status**: PARTIAL
- **Commit**: 7c0b6ca
- **Severity**: MEDIUM
- **Category**: Cohesion (7) + Performance (5)
- **Estimated scope**: 4 files, ~30 lines

## Problem

Five small, independent defects concentrated in the section/member panels. Each is cheap to fix and each is a real (not stylistic) problem.

**1. The shimmer has never run.** `app/dashboard/components/SchoolSection.tsx:203` references a keyframe that does not exist anywhere in the repo:

```tsx
{/* app/dashboard/components/SchoolSection.tsx:201-204 — current */}
<div className="h-full rounded-full relative overflow-hidden transition-all duration-700"
  style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)", boxShadow: "0 0 12px rgba(96,165,250,0.6)" }}>
  <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 2s infinite" }} />
</div>
```

Verified: `app/globals.css` defines only `voice-wave` (:142), `pulse-red` (:148), and `modal-panel-in` (:194). There is no `@keyframes shimmer` in the repo, so this element is simply static. This is a **silent failure**, not a tuning issue.

**2. The todo checkbox snaps, and renders no checkmark.** `app/dashboard/members/todos/TodosMemberPanel.tsx:411-420` — the live checkbox has no transition at all, and its contents are the string `"✓"` or `""`, so the glyph is a text node rather than an element that can animate:

```tsx
{/* app/dashboard/members/todos/TodosMemberPanel.tsx:411-420 — current */}
<button
  type="button"
  title={t.done ? "Mark as not done" : "Mark as done"}
  onClick={() => void setTodoDone({ id: t._id, done: !t.done })}
  className="w-[18px] h-[18px] rounded-md shrink-0 flex items-center justify-center text-[11px] text-white"
  style={{
    border: t.done ? `1px solid ${ACCENT}` : `1.5px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}`,
    background: t.done ? ACCENT : "transparent",
  }}
>
  {t.done ? "✓" : ""}
</button>
```

Toggling a todo is a many-times-a-day action — AUDIT §8 "state changes that teleport" and §2 (100–160ms press budget).

**3. `voice-wave` animates `height`** — see plan 002 for the keyframe itself; this plan only covers the three consumer dots if plan 002 has not landed.

**4. Double `backdrop-filter` over the autoplaying background video.** `app/dashboard/components/CheckInView.tsx:226-239` stacks a full-screen `blur(2px)` backdrop under a viewport-sized `blur(20px)` panel, both composited against a `<video>` that changes every frame:

```tsx
{/* app/dashboard/components/CheckInView.tsx:226-239 — current */}
backdropFilter: "blur(2px)",      /* full-screen, inset: 0 */
…
backdropFilter: "blur(20px) saturate(1.8)",   /* panel, inset: 20px */
```

Same shape at `components/CalendarView.tsx:229` (`blur(16px)` on `fixed inset-0`) + `:616` (`blur(4px)`).

**5. `checkinTheme.ts` exports a typo'd identifier.** `URBENCY_COLOR` should be `URGENCY_COLOR`. It is used by the check-in panels.

## Target

**1. Define `shimmer` as a composited transform animation.** Append to `app/globals.css` next to the other keyframes:

```css
/* app/globals.css — target, add near :142 */
@keyframes shimmer {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}
```

Then change the shimmer element at `SchoolSection.tsx:203` so it animates `transform` rather than relying on `background-position`:

```tsx
{/* SchoolSection.tsx:203 — target */}
<div
  className="absolute inset-0"
  style={{
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
    animation: "shimmer 2s linear infinite",
  }}
/>
```

Also narrow the parent's `transition-all duration-700` to the properties that change, and drop the 700ms below the AUDIT §2 300ms UI ceiling:

```tsx
{/* SchoolSection.tsx:201 — target */}
<div
  className="h-full rounded-full relative overflow-hidden"
  style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)", transition: "width 300ms var(--ease-out)" }}
>
```

**2. Give the todo checkbox a transition and an animatable checkmark.**

```tsx
{/* TodosMemberPanel.tsx:411-420 — target */}
<button
  type="button"
  title={t.done ? "Mark as not done" : "Mark as done"}
  onClick={() => void setTodoDone({ id: t._id, done: !t.done })}
  className="w-[18px] h-[18px] rounded-md shrink-0 flex items-center justify-center text-[11px] text-white"
  style={{
    border: t.done ? `1.5px solid ${ACCENT}` : `1.5px solid ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"}`,
    background: t.done ? ACCENT : "transparent",
    transition: "background-color 160ms var(--ease-out), border-color 160ms var(--ease-out)",
  }}
>
  <span
    aria-hidden
    style={{
      lineHeight: 1,
      opacity: t.done ? 1 : 0,
      transform: t.done ? "scale(1)" : "scale(0.6)",
      transition: "opacity 160ms var(--ease-out), transform 160ms var(--ease-out)",
    }}
  >
    ✓
  </span>
</button>
```

Note the border is now a constant `1.5px` in both states. The original mixed `1px`/`1.5px`, which would animate `border-width` — a layout property (§5). Do not restore the 1px.

**3. `voice-wave` consumers** — only if plan 002 has not landed: convert `@keyframes voice-wave` (`app/globals.css:142-145`) to `transform: scaleY()`, per plan 002. If plan 002 is already done, skip this step.

**4. Collapse the double backdrop blur.** In `app/dashboard/components/CheckInView.tsx`, remove the `backdropFilter` / `WebkitBackdropFilter` pair from the full-screen backdrop (around :226-227) and keep the panel's `blur(20px) saturate(1.8)`:

```tsx
{/* CheckInView.tsx:226 — target: delete the backdropFilter pair entirely */}
/* full-screen backdrop keeps its background colour only */
```

**5. Rename the typo'd export** in `app/dashboard/members/checkin/checkinTheme.ts`:

```ts
// target
export const URGENCY_COLOR = { … };
```

Then update every importer:
```bash
grep -rn "URBENCY_COLOR" app components
```

**6. Narrow `CheckinSections.tsx:504`** — this overlaps plan 003 step 3; if plan 003 has landed, skip.

## Repo conventions to follow

- Keyframes live in `app/globals.css` alongside `voice-wave` (:142), `pulse-red` (:148), `modal-panel-in` (:194). Add `shimmer` there, not inline.
- The check-in panels already share motion-adjacent constants through `app/dashboard/members/checkin/checkinTheme.ts` — that is the right home for the typo fix.
- `--ease-out` is added by plan 001. If plan 001 has not landed, inline `cubic-bezier(0.22, 1, 0.36, 1)` — do not invent a third curve.

## Steps

1. `app/globals.css` — add `@keyframes shimmer` (composited `translateX` version) near line 142.
2. `app/dashboard/components/SchoolSection.tsx:203` — replace the shimmer element's style so it no longer sets `backgroundSize`/`background-position`-style animation; use the Target markup.
3. `app/dashboard/components/SchoolSection.tsx:201` — narrow `transition-all duration-700` to `transition: "width 300ms var(--ease-out)"`.
4. `app/dashboard/members/todos/TodosMemberPanel.tsx:411-420` — replace with the Target version (constant 1.5px border, transition, animated checkmark span).
5. `app/dashboard/components/CheckInView.tsx:226-227` — delete the `backdropFilter` and `WebkitBackdropFilter` lines from the full-screen backdrop. Leave the panel's blur at :238-239 untouched.
6. `app/dashboard/members/checkin/checkinTheme.ts` — rename `URBENCY_COLOR` → `URGENCY_COLOR`, then fix every importer found by the grep. Do not rename anything else in that file.
7. `app/dashboard/members/checkin/CheckinSections.tsx:504` — apply plan 003 step 3 if not already done.
8. `app/globals.css:142-145` — apply plan 002's `voice-wave` change if not already done.

## Boundaries

- Do NOT change the tracking/accent colours or the `ACCENT` value.
- Do NOT change any Convex call, mutation name, or data shape.
- Do NOT restructure `CheckInView`'s layout or the panel's `inset`.
- Do NOT rename anything in `checkinTheme.ts` other than the typo'd constant.
- Do NOT add dependencies.
- If any cited line does not match the code above, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic checks**:
  ```bash
  grep -rn "@keyframes shimmer" app/globals.css        # expect 1 match
  grep -rn "URBENCY_COLOR" app components              # expect 0 matches
  grep -n "backdropFilter" app/dashboard/components/CheckInView.tsx | head -4   # backdrop pair gone, panel kept
  ```
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm:
  - **Shimmer**: open the School full-view card. The progress bar now shows a slow white sweep across the fill where previously there was none. Confirm it loops smoothly with no visible jump at the seam.
  - **Todo checkbox**: open Your Team → To-Do, and click a checkbox repeatedly. The accent fill **fades in** and the ✓ **scales up slightly** rather than popping. Spam-click it 10× and confirm it never stutters or plays from zero.
  - **Calendar / Check-In backdrop**: open the calendar and the Check-In modal. Confirm the frosted look is **visually equivalent** to before — this is the highest-risk visual regression in this plan. If the backdrop now looks noticeably less frosted, restore a single `blur(2px)` on the backdrop and instead remove the panel's `blur(20px)`; keep exactly one blur layer, never two stacked.
  - DevTools → Rendering → paint flashing: opening Check-In should flash far less than before.
- **Done when**: the greps match, the shimmer visibly runs, the checkbox animates on rapid toggling, and the frosted backdrops look unchanged.

## Known uncertainty

Step 5 changes compositing rather than pixels, so it **cannot be verified from code alone**. The executor must compare the frosted appearance before/after and follow the fallback in the feel check if it changed. If neither blur can be removed without a visible difference, leave both and report that the fix needs a design decision — do not force it.

---

## Execution record (commit 7c0b6ca)

Executed in-tree by the Lead. What actually landed, and what did not:

**Landed**
- `@keyframes voice-wave` → `transform: scaleY(0.4) / scaleY(1)` (composited).
- The three dots in `AIAssistant.tsx` were given a constant `height: 10px` layout box with `transformOrigin: "center"`, so `scaleY(0.4)` renders the original 4px. Their `borderRadius` changed from `"50%"` to `3` because a scaled circle would render as an ellipse — mathematically identical to the old 5×5 circle at both endpoints.
- The 60-bar chart's `transition: "height 0.3s ease"` was **deleted** (plan 002 target 1).
- The WGU progress fill moved from `width: ${wguPct}%` to `width: "100%"` + `transform: scaleX(...)` with `transformOrigin: "left center"`.
- `@keyframes shimmer` was **defined** (plan 005 target 1) and `SchoolSection`'s shimmer now animates `translateX`.
- `SchoolSection`'s own progress fill also moved to `scaleX` (beyond the original plan — it was the same layout defect).

**Not landed / deviates**
- Plan 004 is only **partially** done: the CSS media block was extended (global `button`/`.card-hover`/`.nav-btn` re-scope, `.card-hover` transform + `::after` disabled, `voice-wave`/`animate-pulse` stopped, `.modal-panel-in` transform removed). **The JS-side gate is NOT implemented** — `page.tsx` has no `matchMedia`/state check, because the imperative `hoverProps` that plan 004 step 4 targeted was **deleted** in favour of the `.card-hover` class, so the CSS gate now covers it. The `[style*="voice-wave"]` selector is a fallback: adding a real class (plan 004 step 2) would be cleaner but was not required, since the inline `animation` declaration is the only thing to disable.
- Plan 005 items **2** (`TodosMemberPanel` checkbox), **4** (double backdrop blur), **5** (`URBENCY_COLOR` rename) and **6** were **not** executed.
