# 002 — Stop animating layout properties in the dashboard charts

- **Status**: DONE (partial)
- **Commit**: 7c0b6ca
- **Severity**: HIGH
- **Category**: Performance (5)
- **Estimated scope**: 2 files, ~20 lines

## Problem

Three animated indicators in the dashboard animate **layout** properties, which forces layout + paint + composite on every frame. AUDIT §5: "Animate `transform` and `opacity` only. `width`/`height`/`margin`/`padding`/`top`/`left` trigger layout + paint + composite."

**1. The 60-bar workout chart** — `app/dashboard/page.tsx:595-602`:

```tsx
{/* app/dashboard/page.tsx:595-602 — current */}
{bars60.map((b, i) => (
  <div key={i} style={{
    flex: 1, minWidth: 2, borderRadius: 2,
    background: b.active ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb"),
    height: `${b.height}%`,
    transition: "height 0.3s ease",
  }} />
))}
```

60 elements transition `height`.

**2. The degree-progress bar** — `app/dashboard/page.tsx:645-650`:

```tsx
{/* app/dashboard/page.tsx:645-650 — current */}
<div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 100, height: 6, overflow: "hidden" }}>
  <div style={{
    width: `${wguPct}%`, height: "100%",
    background: "#3b82f6", borderRadius: 100,
    transition: "width 0.6s ease",
  }} />
</div>
```

`width` (layout) at **600ms** — 2× the AUDIT §2 300ms UI budget.

**3. The voice-wave loading dots** — `app/globals.css:142-145`, used by `app/dashboard/components/AIAssistant.tsx:118-120`:

```css
/* app/globals.css:142-145 — current */
@keyframes voice-wave {
  0%, 100% { height: 4px; }
  50%      { height: 10px; }
}
```

A forever-looping keyframe animating `height` — layout on every frame, indefinitely.

## Target

**1. Delete the bar-chart transition entirely.** These bars do not animate on a user action: `bars60` (`app/dashboard/page.tsx:232-236`) is recomputed from `workedOutDays`, which is a `useMemo` over Convex data that resolves once on load. The "animation" fires only when data arrives, when it is not reliably visible anyway. Removing it is the strongest fix per AUDIT §1 ("the strongest fix is often delete the animation") and removes 60 potential layout animations.

```tsx
{/* app/dashboard/page.tsx:595-602 — target: no transition */}
{bars60.map((b, i) => (
  <div key={i} style={{
    flex: 1, minWidth: 2, borderRadius: 2,
    background: b.active ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb"),
    height: `${b.height}%`,
  }} />
))}
```

**2. Convert the progress fill to a composited transform.**

```tsx
{/* app/dashboard/page.tsx:645-650 — target */}
<div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 100, height: 6, overflow: "hidden" }}>
  <div style={{
    width: "100%", height: "100%",
    background: "#3b82f6", borderRadius: 100,
    transform: `scaleX(${wguPct / 100})`,
    transformOrigin: "left center",
    transition: "transform 0.3s var(--ease-out)",
  }} />
</div>
```

Note the change from `width: \`${wguPct}%\`` to `width: "100%"` + `scaleX(...)`. The parent already has `overflow: "hidden"`, so the fill is clipped correctly at every value.

**3. Convert the voice-wave keyframes to a transform.**

```css
/* app/globals.css:142-145 — target */
@keyframes voice-wave {
  0%, 100% { transform: scaleY(0.4); }
  50%      { transform: scaleY(1); }
}
```

The three consumer dots at `app/dashboard/components/AIAssistant.tsx:118-120` set `height: 10px` (or similar) as their base size. Confirm their base height visually equals the current peak (10px). If a dot's base height is 4px rather than 10px, change the base to 10px and add `transformOrigin: "center"` so `scaleY(0.4)` renders as 4px. **Read the three consumer sites before editing** — this keyframe is shared.

## Repo conventions to follow

- `transform` + `transformOrigin` is already the house pattern for composited motion: `app/dashboard/page.tsx:469` uses `transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)"` with `transform: translate(...)`.
- Reference the shared curve token as `var(--ease-out)` (added by plan 001). If plan 001 has not landed, inline `cubic-bezier(0.22, 1, 0.36, 1)` instead — do **not** invent a third curve.

## Steps

1. `app/dashboard/page.tsx` — in the `bars60.map` block around lines 595-602, delete the `transition: "height 0.3s ease",` line. Change nothing else in that block.
2. `app/dashboard/page.tsx` — in the degree-progress block around lines 645-650, apply the **Target** version for item 2: `width` becomes `"100%"`, add `transform` + `transformOrigin`, replace the transition line.
3. `app/globals.css` — replace the `@keyframes voice-wave` body (lines 142-145) with the transform version from **Target** item 3.
4. Read `app/dashboard/components/AIAssistant.tsx:110-125` first. If the dots' base `height` is not 10px, set it to 10px and add `transformOrigin: "center"` to each of the three dot styles. If it already is 10px, make no change there.
5. Search for any other consumer of `voice-wave` before finishing:
   ```bash
   grep -rn "voice-wave" app components
   ```
   Expected: only `globals.css` (definition) and `AIAssistant.tsx` (3 uses). If more appear, STOP and report.

## Boundaries

- Do NOT change the *values* being visualized (`bars60`, `wguPct`, bar heights, colors).
- Do NOT change layout, spacing, or markup structure — only the transition/transform lines named in Steps.
- Do NOT touch `TodosSection.tsx:156` or `SchoolSection.tsx:201` — those progress bars are medium severity and belong to a later plan.
- Do NOT add dependencies.
- If the line numbers or code above do not match what you find, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic check** — confirm no layout property is transitioned in these spots:
  ```bash
  grep -n 'transition: "height\|transition: "width' app/dashboard/page.tsx
  ```
  Expected: no matches.
  ```bash
  sed -n '142,145p' app/globals.css
  ```
  Expected: `transform: scaleY(...)` lines, no `height:`.
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm:
  - The 60-bar chart still renders with **correct bar heights** — this is the highest-risk regression in this plan. Compare against the `active days / last 60` count in the card footer.
  - The Degree Progress bar still reads the correct percentage (compare to the `%` number next to it) and now fills smoothly rather than snapping.
  - Open the AI assistant (bottom widget), trigger a loading state, and confirm the three dots still pulse as a wave with the same amplitude and rhythm as before.
  - DevTools → Rendering → paint flashing: confirm the dots no longer repaint the surrounding layout.
- **Done when**: the greps are clean, heights and percentages render identically to before, and the dots' wave amplitude is visually unchanged.

## Known uncertainty

Whether the progress fill's 600ms→300ms reduction is desirable is a **feel** judgment that code cannot settle. 300ms is the AUDIT §2 ceiling for UI; if the shorter fill feels abrupt in practice, raise it to 400ms and note it, but do not go back to 600ms.

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
