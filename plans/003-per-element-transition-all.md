# 003 — Replace per-element `transition: "all"` with explicit property lists

- **Status**: TODO
- **Commit**: 7c0b6ca
- **Severity**: MEDIUM
- **Category**: Performance (5) + Cohesion (7)
- **Estimated scope**: 4 files, ~6 edits

## Problem

Beyond the global rule fixed by plan 001, six elements still declare `transition: all` inline. Each animates properties it did not intend to, and each uses a different duration for the same class of interaction.

| Location | Current | Actually changes |
|---|---|---|
| `app/dashboard/page.tsx:1095` | `transition: "all 0.3s ease"` | `background`, `color` |
| `app/dashboard/page.tsx:814` | `transition: "all 0.2s ease"` | **nothing** — see note |
| `app/dashboard/members/checkin/CheckinSections.tsx:504` | `transition: "all 0.2s ease"` | `border-width` (1px ↔ 1.5px), `border-color`, `color` |
| `app/dashboard/components/CheckInView.tsx:341` | `transition: "all 0.25s ease"` | `border`, `background`, `box-shadow` |
| `app/dashboard/components/AIAssistant.tsx:45` | `all 0.4s cubic-bezier(0.22, 1, 0.36, 1)` | `width`, `bottom`, `border-radius` |
| `app/dashboard/components/AIAssistant.tsx:64` | `all 0.3s ease` | `background`, `color` |

Verbatim examples:

```tsx
{/* app/dashboard/page.tsx:1093-1096 — current (member sub-tab) */}
style={{
  padding: "8px 18px", borderRadius: 100, border: "none", cursor: "pointer",
  fontSize: "0.82rem", fontWeight: 600,
  background: active ? (isDark ? "rgba(255,255,255,0.9)" : "#fff") : "transparent",
  color: active ? "#1a1a1a" : textMuted,
  transition: "all 0.3s ease",
}}
```

```tsx
{/* app/dashboard/members/checkin/CheckinSections.tsx:501-504 — current */}
style={{
  border: active ? `1.5px solid ${hexA(ACCENT, 0.45)}` : `1px solid …`,
  transition: "all 0.2s ease",
}}
```

**Note on `page.tsx:814`** — the todo checkbox span there has a constant `border` and no `background` set (there is no `t.done` branch and no checkmark), so its transition is **inert**. Do not try to "fix" it by adding properties; the real live checkbox is `TodosMemberPanel.tsx:411`, which is fixed by plan 005. For this plan, delete the dead `transition` line at `page.tsx:814` and change nothing else.

AUDIT §5: "`transition: all` animates unintended properties off-GPU — always a finding."

## Target

Replace each `all` with the specific properties that change, and use the AUDIT §2 duration budget for that interaction class.

```tsx
{/* page.tsx:1095 — target (sub-tab: 100+/day control → fast) */}
transition: "background-color 150ms var(--ease-out), color 150ms var(--ease-out)",
```

```tsx
{/* AIAssistant.tsx:64 — target (same class of control) */}
transition: "background-color 150ms var(--ease-out), color 150ms var(--ease-out)",
```

```tsx
{/* CheckinSections.tsx:504 — target (chip selection = state indication) */}
transition: "border-color 160ms var(--ease-out), color 160ms var(--ease-out), border-width 160ms var(--ease-out)",
```

> If animating `border-width` repaints visibly in the feel check, instead set the border-width constant at `1.5px` in both states and animate only `border-color`. That is the preferred outcome if it looks identical.

```tsx
{/* CheckInView.tsx:341 — target (day cell: most-clicked control) */}
transition: "background-color 160ms var(--ease-out), border-color 160ms var(--ease-out)",
```

```tsx
{/* AIAssistant.tsx:45 — target: scope the transition; width is deliberately NOT listed */}
transition: "bottom 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
```

> **Do NOT put `width` in this list.** `app/dashboard/components/AIAssistant.tsx:41` sets `width: expanded ? 380 : "auto"`, and CSS **cannot interpolate `width` to or from the keyword `auto`** — it is a discrete change. So `width` was *already snapping* under `transition: all`; listing it would achieve nothing, and listing it would imply a fix that does not happen.
>
> Fixing the width snap properly requires restructuring the panel (e.g. replacing `: "auto"` with a fixed collapsed width, or animating `max-width` with known endpoint values). That is out of scope here and is recorded as a follow-up in plan 009. The value of this step is narrowing the transition so unrelated properties stop animating — nothing more.

## Repo conventions to follow

- The repo already writes explicit property lists where it is correct, e.g. `components/JobLeadsFeed.tsx:87`:
  ```tsx
  transition: "background 0.2s ease, color 0.2s ease"
  ```
- `checkinTheme.ts` exports `ACCENT` and `hexA()`; the check-in panels import from it. Keep using that module rather than new literals.

## Steps

1. `app/dashboard/page.tsx:1095` — replace the `transition` line with the Target version.
2. `app/dashboard/page.tsx:814` — delete the `transition: "all 0.2s ease",` line (inert styling).
3. `app/dashboard/members/checkin/CheckinSections.tsx:504` — replace with the Target version.
4. `app/dashboard/components/CheckInView.tsx:341` — replace with the Target version.
5. `app/dashboard/components/AIAssistant.tsx:45` — replace with the Target version.
6. `app/dashboard/components/AIAssistant.tsx:64` — replace with the Target version.

## Boundaries

- Do NOT touch the global rules in `app/globals.css` (plan 001 owns those).
- Do NOT restructure any markup, and do NOT change the AIAssistant's expand/collapse behavior or its `zoom`/`scale`.
- Do NOT touch `AIAssistant.tsx:56` (`border-radius 0.4s …`) — it already names a property.
- Do NOT change `CheckinSections.tsx:662`, `:683`, `CheckInView.tsx:255/270/294/306/398/548/587` — those already name properties and are inside budget.
- Do NOT add dependencies.
- If a cited line does not match the code above, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic check**:
  ```bash
  grep -rn 'transition: "all' app/dashboard/page.tsx app/dashboard/members app/dashboard/components/AIAssistant.tsx app/dashboard/components/CheckInView.tsx
  ```
  Expected: no matches.
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm:
  - The **member sub-tab switcher** (Your Team card → Schedule/To-Do/Check-In) still shows selected state instantly on click.
  - In the calendar, clicking **day cells** highlights them promptly — this is the most-clicked control in the app, so it should feel immediate, not eased-in.
  - The check-in **mood/time chips** still visibly indicate selection.
  - The **AI assistant** still expands and collapses smoothly, and the chevron still rotates.
  - DevTools → Animations at 10%: confirm the sub-tab and day cells now list only `background-color`/`color`/`border-color`, not `width`/`height`/`padding`.
- **Done when**: the grep is clean, every listed interaction still gives correct visual feedback, and nothing above regressed.

## Known uncertainty

The 150ms vs 160ms split is arbitrary within the AUDIT §2 budget (button press 100–160ms; small popovers 125–200ms). Consistency matters more than the exact number: if the executor finds the repo drifting toward one value, use that one everywhere and note the deviation.
