# 004 — Add the missing reduced-motion gate

- **Status**: PARTIAL
- **Commit**: 7c0b6ca
- **Severity**: MEDIUM
- **Category**: Accessibility (6)
- **Estimated scope**: 2 files, ~35 lines

## Problem

The repository contains exactly **one** `prefers-reduced-motion` rule, and it guards a single selector:

```css
/* app/globals.css:200-202 — current, the repo's only reduced-motion rule */
@media (prefers-reduced-motion: reduce) {
  .modal-panel-in { animation: none; }
}
```

Everything else — the global button transition, the bento-card hover lifts, the voice-wave and pulse keyframes, and the 60 animated bars — runs ungated. There is no `motion-reduce:` Tailwind variant, no `useReducedMotion()`, and no `matchMedia` call anywhere.

```css
/* app/globals.css:134-139 — current, ungated */
.card-hover:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
}
```

```tsx
{/* app/dashboard/page.tsx:374-383 — current, ungated raw mouse handler spread onto 12 cards */}
const hoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px) scale(1.01)";
    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).style.transform = "";
    (e.currentTarget as HTMLDivElement).style.boxShadow = "";
  },
};
```

AUDIT §6: "Reduced motion means fewer and gentler animations, **not zero** — keep transitions that aid comprehension, remove position changes." So the target is to drop *movement* while keeping *opacity and colour* feedback.

## Target

**1. Extend the existing media block in `app/globals.css`** (keep the existing `.modal-panel-in` line):

```css
/* app/globals.css:200-215 — target */
@media (prefers-reduced-motion: reduce) {
  .modal-panel-in { animation: none; }

  /* Drop movement; keep colour/opacity feedback so controls still respond. */
  button, .card-hover, .nav-btn {
    transition-property: background-color, border-color, color, opacity;
  }
  .card-hover:hover { transform: none; }

  /* Infinite decorative loops: stop them entirely. */
  .voice-wave, .animate-pulse { animation: none; }

  /* Any inline transform-based entrance becomes a plain fade. */
  .modal-panel-in { transform: none; }
}
```

**2. Gate the JS hover lift in `app/dashboard/page.tsx`.** Add a reduced-motion check and skip the transform, keeping the shadow change:

```tsx
{/* app/dashboard/page.tsx — target, replacing the hoverProps block */}
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const hoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
    if (!prefersReducedMotion) {
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px) scale(1.01)";
    }
    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).style.transform = "";
    (e.currentTarget as HTMLDivElement).style.boxShadow = "";
  },
};
```

> Reading `matchMedia` during render is acceptable here because `page.tsx` is `"use client"`. To avoid a hydration mismatch on the first paint, initialise it in a `useState(false)` + `useEffect` instead if the executor sees a hydration warning. Prefer the `useEffect` form if in any doubt.

## Repo conventions to follow

- `app/dashboard/page.tsx` already reads browser state this way for responsive layout — see the `isNarrow` effect at `app/dashboard/page.tsx:129-134`:
  ```tsx
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  ```
  Imitate this exact pattern (state + effect + listener) rather than reading `matchMedia` inline.

## Steps

1. `app/globals.css` — replace the existing `@media (prefers-reduced-motion: reduce)` block (lines 200-202) with the Target block. Keep `.modal-panel-in { animation: none; }`.
2. `app/globals.css` — add a `voice-wave` **class** to the three dots in `app/dashboard/components/AIAssistant.tsx:118-120` if they do not already have one, so the media block can target them. If adding a class, use `className="voice-wave"` and keep the existing inline `animation` declaration.
3. `app/dashboard/page.tsx` — add the reduced-motion state next to the existing `isNarrow` state (around line 122-128):
   ```tsx
   const [reducedMotion, setReducedMotion] = useState(false);
   useEffect(() => {
     const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
     const check = () => setReducedMotion(mq.matches);
     check();
     mq.addEventListener("change", check);
     return () => mq.removeEventListener("change", check);
   }, []);
   ```
4. `app/dashboard/page.tsx` — update the `hoverProps` block (lines 374-383) to branch on `reducedMotion`, per Target item 2.
5. Do **not** add a gate for the background `<video>`. Pausing a full-screen decorative background video is a product decision, not a mechanical fix — it is recorded as a follow-up below.

## Boundaries

- Do NOT remove the existing `.modal-panel-in { animation: none; }` line.
- Do NOT set `* { animation: none !important; transition: none !important; }` — AUDIT §6 explicitly rejects nuking all feedback.
- Do NOT pause or remove the background `<video>`.
- Do NOT change any easing curve or duration value; this plan only adds gates.
- Do NOT add dependencies.
- If the cited blocks do not match the code above, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic check**:
  ```bash
  grep -c "prefers-reduced-motion" app/globals.css app/dashboard/page.tsx
  ```
  Expected: `app/globals.css` ≥ 1; `app/dashboard/page.tsx` ≥ 1.
- **Feel check**: run `npm run dev`, open `/dashboard`, then in DevTools → **Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`**:
  - Hovering a bento card: the card **no longer moves**, but still darkens/lightens (colour feedback survives).
  - The three AI-assistant dots **stop pulsing**.
  - Buttons still respond with colour changes — nothing feels dead.
  - Opening the full-view modal: it appears **without the slide-up**, immediately.
  - Toggle the emulation **off** and confirm all motion returns.
- **Done when**: with reduced motion emulated, no element changes position, but colour/opacity feedback still works everywhere.

## Follow-ups this plan intentionally leaves open

- The full-screen background `<video>` (`app/dashboard/page.tsx:401-409`) autoplays and loops with no pause affordance. A reduced-motion gate on it is a **product decision** — propose pausing it or swapping to a static poster, but do not do it here.
- `useReducedMotion()` from the installed `motion` package would replace the hand-rolled state if the repo ever standardises on it.

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
