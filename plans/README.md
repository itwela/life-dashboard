# Animation improvement plans

Produced by the `improve-animations` skill (audit → plan workflow, Emil Kowalski's
animation philosophy) against commit **7c0b6ca**.

The audit was read-only. These plans are the only artifacts it produces — **no source
file was modified**. Each plan is written to be executed by a weaker model with zero
context, so it inlines every exact value and file:line instead of referring to "the
audit above".

## Plans

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-kill-global-transition-all.md) | Stop the global button transition from animating every property | HIGH | TODO |
| [002](002-layout-property-animations.md) | Stop animating layout properties in the dashboard charts | HIGH | TODO |
| [003](003-per-element-transition-all.md) | Replace per-element `transition: "all"` with explicit property lists | MEDIUM | TODO |
| [004](004-reduced-motion-gate.md) | Add the missing reduced-motion gate | MEDIUM | TODO |
| [005](005-member-panel-motion-defects.md) | Fix the dead shimmer and the member-panel motion defects | MEDIUM | TODO |
| [006](006-modal-interruptibility.md) | Make modal open/close interruptible and reversible | HIGH | TODO |
| [007](007-modal-entry-motion.md) | Give the un-animated modals the house entry motion | MEDIUM | TODO |
| [008](008-direct-manipulation-feedback.md) | Add press feedback and remove the dead to-do transition | MEDIUM | TODO |
| [009](009-known-snaps-left-open.md) | Known snaps deliberately left open | LOW | TODO |

## Recommended execution order

1. **001** — establishes the `--ease-out` and `--dur-*` tokens every later plan references.
2. **002** — highest felt improvement; removes 60+ layout animations.
3. **004** — builds directly on 001's global rule (it re-scopes the same selectors under a media query).
4. **003** — per-element cleanups; independent of the others.
5. **005** — mixed bag of small fixes, including the only true defect found (a keyframe that never existed).
6. **006** — the highest-leverage remaining find: every modal close is currently a hard cut.
7. **007** — depends on 006 (reuses the class it introduces).
8. **008** — press feedback and the to-do tick; independent, but touches `page.tsx` heavily so run it alone.
9. **009** — reference only; no code change.

## Dependencies

- **004 depends on 001.** Plan 004's media query re-scopes `button, .card-hover, .nav-btn`, the same selectors plan 001 rewrites. Land 001 first or the two edits will conflict.
- **007 depends on 006.** 006 replaces `.modal-panel-in` with `.modal-panel` + `data-open`; 007 then applies that class to five more modals. If 006 has not landed, 007 must use `.modal-panel-in` instead.
- **006 and 009 interact.** The member sub-tab body swap (009, last section) should be sequenced *after* 006, because it interacts with 006's mount latch.
- **008 touches all 12 card elements in `page.tsx`** and resolves a `transform` ownership conflict between `hoverProps` and the press state. Run it when no other plan is editing `page.tsx`.
- **003 and 005 overlap on one edit** — `CheckinSections.tsx:504` appears in both. Whichever lands second should skip that step (both plans say so).
- **005 step 3 and 002 step 3 are the same change** (`@keyframes voice-wave`). Whichever lands first wins; the other skips it.
- **002, 003, 005, 008** reference `var(--ease-out)` from 001. If run before 001, inline `cubic-bezier(0.22, 1, 0.36, 1)` — never invent a third curve.
- **006 and 002 both matter most together**: 002 removes the layout animations, 006 removes the uninterruptible modal.

## Deliberately out of scope

- **`BentoCard.tsx` and `charts/CardCharts.tsx` are dead code.** Verified by three
  independent greps: zero importers anywhere in `app/`, `components/`, `lib/`, `convex/`,
  and no dynamic imports or barrel files. Their findings are real but unreachable —
  including infinite GSAP `repeat: -1` idle timelines with no reduced-motion gate,
  a per-frame `setDisplayText` rAF loop in `components/ui/hyper-text.tsx:92-104`, and
  Recharts' default mount animation. **Fix or delete the component before spending
  effort on its motion.** `components/ui/{hyper-text,text-animate,typing-animation}.tsx`
  are transitively dead too, since `BentoCard` is their only importer.
- **The background `<video>`** (`app/dashboard/page.tsx:401-409`) autoplays and loops
  full-screen with no pause affordance or reduced-motion gate. A product decision, not a
  mechanical fix — flagged in plan 004.
- **`zoom: 1.25`** on the three modal panels (`page.tsx:1036`, `:1108`, `:1187`) versus
  `transform: scale(1.25)` in `AIAssistant.tsx:42` — two mechanisms for one design
  constant, and `AIAssistant` additionally sits at a persistent `scale(1.25)`. Worth a
  design decision; not a defect.
- **`@keyframes pulse-red`** (`globals.css:148`) is referenced nowhere while
  `animate-pulse` covers the same semantic in four places. Deleting it is safe but has no
  user-visible effect.

## What the audit found that is *not* a problem

Recording these so a later agent does not "fix" them:

- **No `ease-in` anywhere** in `app/` or `components/`. The textbook finding does not exist here.
- **No `linear`** on any transition, and **no `will-change`** misuse (it appears nowhere).
- **Tailwind's bare `transition-all` / `-colors` / `-transform` classes are already correct:**
  `node_modules/tailwindcss/theme.css:492-493` sets `--default-transition-duration: 150ms`
  and Material's standard curve. 45 such usages are inside budget — do not add
  `duration-*` overrides to them.
- The **modal at 500ms** (`.modal-panel-in`) is within the AUDIT §2 modal budget of
  200–500ms. It is the ceiling, not a violation.
- `transform-origin: center` on the centered modals is **exempt** per AUDIT §3 — modals
  appear centered; only trigger-anchored elements need to scale from their trigger.
- `CheckInView.tsx:255/270/294/306/398/548/587`, `CheckinSections.tsx:662/683`,
  `AIAssistant.tsx:143/153`, `CalendarView.tsx:339/464/574`, and all Tailwind
  `transition-colors`/`-opacity`/`-transform` in the section components: every one is
  ≤300ms with a correct curve and already names its properties.

## Note on the house curve

The repo's dominant curve is `cubic-bezier(0.22, 1, 0.36, 1)` (9 sites). The AUDIT §2
canonical `--ease-out` is `cubic-bezier(0.23, 1, 0.32, 1)` — **a near-miss, not the same
value.** Plan 001 deliberately names the incumbent curve `--ease-out` rather than
silently switching to the canonical one, so the swap stays a one-line, deliberate
decision later. Do not "correct" the curve as part of any plan in this directory.
