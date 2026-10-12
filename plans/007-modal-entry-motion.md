# 007 — Give the un-animated modals the house entry motion

- **Status**: TODO
- **Commit**: 7c0b6ca
- **Severity**: MEDIUM
- **Category**: Missed opportunities (8) + Cohesion (7)
- **Estimated scope**: 5 files, ~15 lines

## Problem

The house modal entrance exists (`.modal-panel`, after plan 006 lands) and is applied to **three** surfaces. Five other modals have **no entry motion at all** — they pop into existence while their siblings glide in. That inconsistency is the finding; each individually is just a missing polish touch, but together they make the app feel like two different products.

| Surface | Location | Current |
|---|---|---|
| Shared form modal (Finances/School/Projects/Reading/Workouts/Content) | `app/dashboard/components/AddModal.tsx:36` | `if (!open) return null;` — no motion |
| Records image viewer | `app/dashboard/components/RecordsSection.tsx:148` | `{viewing && (` — no motion |
| Content post modal | `app/dashboard/components/ContentSection.tsx:240` | `{viewOpen && viewingPost && (` — no motion |
| Check-In modal | `app/dashboard/components/CheckInView.tsx:223` | `position: "fixed", inset: 0, zIndex: 50` — no animation class |
| Calendar modal | `components/CalendarView.tsx:228` | `className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-5"` — no animation class |

Verbatim, the clearest example:

```tsx
{/* app/dashboard/components/AddModal.tsx:36 — current */}
if (!open) return null;
```

AUDIT §8: "Spatially-connected UI (a panel that appears from a trigger) with no motion explaining where it came from." These are **occasional** surfaces, which per AUDIT §1 get standard animation.

## Target

Apply the existing house entrance rather than inventing a new one. **Wait for plan 006 to land first** — it defines the class. If plan 006 has not landed, use the current `.modal-panel-in` class instead, and this plan becomes a trivial one-class addition per modal.

For each modal's outer wrapper, add the house class and open state:

```tsx
{/* target shape — AddModal.tsx */}
<div className="modal-panel" data-open={open} …>
```

And for the four `{x && (` conditional mounts, adopt plan 006's mount-latch so the **exit** also animates. Do not hand-roll a second latch helper — reuse the same `useState` + `useEffect` + `setTimeout(…, 500)` shape from plan 006.

Two important exceptions:

- **`AddModal.tsx`** currently early-returns `null` before rendering anything. Restructure to `if (!mounted) return null;` using the latch, keeping all existing inner markup untouched.
- **`CheckInView` / `CalendarView`** are large full-screen surfaces with their own backdrops. Add the class to the **panel** element only, not to the backdrop, and keep their `z-index` and `inset` exactly as they are.

## Repo conventions to follow

- The house entrance is defined once in `app/globals.css` and consumed by `app/dashboard/page.tsx:1036/:1108/:1187`. Extend that convention; do not add per-component keyframes.
- The mount-latch shape comes from plan 006, which itself follows the existing `isNarrow` effect at `app/dashboard/page.tsx:129-134`.

## Steps

1. Confirm plan 006 has landed (`grep -n "modal-panel" app/globals.css`). If it has not, STOP and report that 007 depends on 006.
2. `app/dashboard/components/AddModal.tsx` — replace the `if (!open) return null;` at :36 with a mounted-latch check, and add `className="modal-panel" data-open={open}` to the outermost returned element.
3. `app/dashboard/components/RecordsSection.tsx:148` — add the latch and `className="modal-panel" data-open={viewing !== null}` to the viewer wrapper.
4. `app/dashboard/components/ContentSection.tsx:240` — same treatment for the post modal.
5. `app/dashboard/components/CheckInView.tsx:223` — add `className="modal-panel" data-open={true}` to the **panel** (the element with `backdropFilter: "blur(20px)"`), leaving the fixed backdrop unanimated.
6. `components/CalendarView.tsx:228` — same: add the class to the inner panel element, leaving the fixed backdrop alone.
7. Verify each of the five now animates on open and on close.

## Boundaries

- Do NOT invent a new duration or curve — reuse `.modal-panel` exactly as defined.
- Do NOT animate the full-screen backdrops; only the panels.
- Do NOT change `z-index`, `inset`, `zoom`, or any layout value of these modals.
- Do NOT change the inner content or form fields of `AddModal`.
- Do NOT touch the three modals already handled by plan 006.
- Do NOT add dependencies.
- If a cited line does not match, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic check**:
  ```bash
  grep -rn "modal-panel" app/dashboard/components/AddModal.tsx app/dashboard/components/RecordsSection.tsx app/dashboard/components/ContentSection.tsx app/dashboard/components/CheckInView.tsx components/CalendarView.tsx
  ```
  Expected: one class reference per file (5 total).
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm each of these animates in **and** out with the same feel as the bento full-view modal:
  - Finances → "Add" (shared form modal).
  - Records → click a thumbnail (image viewer).
  - Content → open a post.
  - The calendar button (top-right) → CalendarView.
  - Calendar → "Check-In".
  - Then confirm no modal's backdrop is moving independently of its panel.
- **Done when**: all five animate identically to the existing modals, and no backdrop animates on its own.

## Known uncertainty

Whether a **viewer** (Records image, Content post) deserves the full 500ms panel entrance or a snappier reveal is a feel judgment. The house value is the safe default; if a viewer feels sluggish, drop that one to 300ms and note the deviation rather than inventing a new token.
