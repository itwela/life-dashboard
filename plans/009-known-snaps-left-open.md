# 009 — Known snaps deliberately left open

- **Status**: TODO
- **Commit**: 7c0b6ca
- **Severity**: LOW
- **Category**: Physicality (3) + Interruptibility (4) + Missed opportunities (8)
- **Estimated scope**: reference document — no code change required

## Purpose

The audit found four real motion defects that are **deliberately not fixed** by plans 001–008, because each either needs a product decision, only affects dead code, or costs more than the payoff. They are recorded here so they are not lost, and so a future agent does not "discover" them and fix them inconsistently.

Each entry states what is wrong, why it was deferred, and what a correct fix would look like.

---

## 009-A — The AI assistant's width snaps to `auto`

**Location**: `app/dashboard/components/AIAssistant.tsx:41` and `:45`

```tsx
{/* current */}
width: expanded ? 380 : "auto",
transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
```

**Wrong because**: CSS cannot interpolate `width` to or from the keyword `auto`. The panel's `bottom` (40px → 56px) and `border-radius` (100 → 24) tween, but the **width hard-snaps**. AUDIT §3: motion that breaks physical intuition — the frame slides while the surface it grows into jumps. Also `{expanded && (` at `:86` pops the body in with no transition.

**Deferred because**: this is the only remaining *layout* animation in the app that cannot simply be made composited. It has no simple fix.

**Correct fix (needs a decision)**: pick one —
1. Give the collapsed state a fixed width instead of `"auto"` (e.g. `width: expanded ? 380 : 176`), then `width` interpolates. Requires measuring/hardcoding the collapsed pill.
2. Keep `width: "auto"` and animate `max-width` between two known values with `overflow: hidden`.
3. Leave the snap and remove `width` from the transition list so the intent is honest (plan 003 already does this).

**Do not** list `width` in a transition while it is `"auto"` — that is what plan 003 corrects.

---

## 009-B — The to-do list vanishes rather than exiting

**Location**: `app/dashboard/page.tsx:241` + `:800-803`

```tsx
const todosOpen = todos.filter(t=>!t.done);
```

**Wrong because**: `todosSorted` is open-only, so completing a row removes it on the same frame; the list closes up with no exit. Copying the old dashboard's pattern, `TodosSection.tsx` filters the same way (`status === "open"`, `:75-78`).

**Deferred because**: plan 008 adds a 160ms completion *tick* before the row leaves, which addresses the felt problem (no acknowledgement) without the complexity of an exit animation.

**Correct fix if ever wanted**: keep a short-lived local set of recently-completed ids, render rows in that set with a collapsing height/opacity for ~200ms before dropping them. This requires a mount-latch on a *filtered* list, which risks double-rendering and key churn — hence deferred.

---

## 009-C — The calendar day panel teleports

**Location**: `components/CalendarView.tsx:335` (`onClick={() => setSelected(date)}`)

**Wrong because**: clicking a day swaps `{selectedLabel}` (`:445`) and the entire `selectedEvents.map` list (`:450`) with no transition. `dropOnDay` also calls `setSelected(date)`, so dragging an event out of one column and into another re-renders the panel with no motion. AUDIT §8: "content swaps, layout jumps" + spatially-connected UI.

**Deferred because**: the calendar is the densest interactive surface in the app, and a wrong transition here is more noticeable than no transition. It also needs a direction-aware decision (does the panel slide left or right when moving between days?).

**Correct fix if wanted**: a ≤200ms fade of the day panel's *content* only (never the 42-cell grid), or an 8–12px direction-aware slide derived from the sign of the date delta. Gate it behind reduced motion (plan 004).

**Note**: the audit explicitly **rejected** animating the 42-cell grid itself — filter/tab switching there is high-frequency and animating it would fight the click.

---

## 009-D — GSAP motion in dead code

**Location**: `app/dashboard/components/BentoCard.tsx` (and transitively `components/ui/{hyper-text,text-animate,typing-animation}.tsx`, `components/charts/CardCharts.tsx`)

**Verified dead**: zero importers anywhere in `app/`, `components/`, `lib/`, `convex/`; no dynamic imports; no barrel file. `BentoCardKey` (`finances | school | fitness | reading | projects | content | leads`) matches the dashboard's section keys, so this is an **orphaned predecessor** to the inline cards in `page.tsx`.

**Real findings inside it, all currently unreachable**:
- `:102` — `gsap.timeline({ repeat: -1 })` drives 7 perpetual idle loops; nothing ever comes to rest. AUDIT §3 ("rebounding where no momentum exists") + §1.
- `:141` / `:210` — enter does `idleTlRef.current?.pause()`, leave's `onComplete` calls `.restart()`; leave-then-re-enter within 350ms restarts the idle loop *under the cursor*. Enter/leave tweens share `scale`/`y` with **no `overwrite`** (zero repo-wide hits).
- `:183` / `:191` — card text re-enters from `x: -18` (or `y: 14`) on every hover while the leave path is an instant `gsap.set` — no reversible exit. AUDIT §3 "enters from an arbitrary direction".
- `:161` / `:165` / `:169` — `rotation: 0.5` with no `transform-origin` anywhere in the file, so cards pivot about their centre rather than the edge they are lifted from.
- `:231` — `key={\`title-${cardKey}-${isHovered}\`}` forces a fresh mount-enter per hover; unmount-driven motion cannot reverse. AUDIT §4.
- No reduced-motion branch on any GSAP tween. AUDIT §6.
- `components/ui/hyper-text.tsx:92-104` — a rAF loop calling `setDisplayText` every frame (per-frame React re-render). AUDIT §5.
- `components/charts/CardCharts.tsx` — Recharts defaults `isAnimationActive` to true, animating SVG geometry on the main thread.

**Deferred because**: fixing motion in code that never runs is not worth any effort.

**Correct action**: **delete** `BentoCard.tsx` and `CardCharts.tsx` (and then `components/ui/{hyper-text,text-animate,typing-animation}.tsx` if nothing else uses them). If they are intended to be revived, fix the interruptibility and reduced-motion issues **before** wiring them back in — do not resurrect them as-is.

---

## Also intentionally out of scope

- **`pulse-red` keyframe** (`app/globals.css:148`) is referenced nowhere, while `animate-pulse` covers the same semantic in four places (`ReadingSection.tsx:120`, `SchoolSection.tsx:238`, `members/schedule/parts.tsx:169`, `components/ui/typing-animation.tsx:160`). Deleting the dead keyframe is safe but has zero user-visible effect.
- **`zoom: 1.25` vs `transform: scale(1.25)`** — one design constant expressed two ways (`page.tsx:1036/:1108/:1187` vs `AIAssistant.tsx:42`). `transform` composes with the element's own transitions; `zoom` does not. Worth unifying, but it changes layout math and is not a motion defect.
- **The full-screen background `<video>`** (`app/dashboard/page.tsx:401-409`) autoplays, loops, and has no pause affordance or reduced-motion gate. A product decision, flagged in plan 004.
- **`AvatarEditor` drag has no inertia or boundary resistance** (`:62-71`): the crop drag ends in a dead stop and a photo can be flung outside the circular mask. AUDIT §4 ("hard stops at drag boundaries instead of rising friction"). Gesture physics is a feature, not a polish fix — and this is a deliberate power-user control where 1:1 fidelity matters more than momentum.
- **Plan 006 does not fix the member sub-tab body swap** (`page.tsx:1109/:1124/:1136`): switching Schedule/To-Do/Check-In teleports the panel body while only the pill cross-fades. The tab switcher is the one tab control in the app that *does* earn motion (3 options, occasional use), but it interacts with plan 006's mount latch and should be sequenced after it. A ≤200ms fade on the panel body only is the right shape.

## 009-E — The card hover shadow cannot be made composited without a DOM wrapper

**Location**: `app/globals.css` (`.card-hover:hover`) + `app/dashboard/page.tsx` (12 cards)

**What was tried**: replacing the animated `box-shadow` with a pseudo-element whose
`opacity` cross-fades (so hover would animate only `transform` + `opacity`).

**Why it was reverted**: the technique does not work on these cards. They are
`overflow: hidden` with an **opaque** background (`background: isDark ? "rgba(26,26,26,0.98)" : "#fff"`),
so a `z-index: -1` pseudo-element is (a) clipped by `overflow: hidden` and (b) painted
*behind* the card's own background. The hover shadow would have silently vanished —
a visible regression that static checks cannot catch.

**Current state**: the hover shadow is animated directly via `box-shadow` (160ms,
`var(--ease-out)`), which repaints the card each frame. This is the honest tradeoff —
a correct shadow beats a composited invisible one.

**Correct fix if wanted**: wrap each card in an unclipped parent and move the shadow to
that wrapper:

```tsx
<div className="card-shell">          {/* no overflow hidden, owns the shadow */}
  <div className="card-hover" style={solidStyle}>…</div>
</div>
```
```css
.card-shell { position: relative; }
.card-shell::after { content: ""; position: absolute; inset: 0; border-radius: 40px;
  opacity: 0; transition: opacity 160ms var(--ease-out);
  box-shadow: 0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
  pointer-events: none; }
.card-shell:has(.card-hover:hover)::after { opacity: 1; }
```

This changes the grid's DOM structure (the wrapper becomes the grid item), so it needs a
visual check on desktop and both responsive breakpoints. Deferred for that reason.

---

## Verification

This document requires no code change, so there is nothing to verify mechanically. Treat it as the acceptance criteria for any future work on these items: if a future change touches one of these locations, it should either implement the stated correct fix or update this document with the reason it did not.
