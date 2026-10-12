# 008 — Add press feedback and give the to-do tick its motion budget

- **Status**: TODO
- **Commit**: 7c0b6ca
- **Severity**: MEDIUM
- **Category**: Physicality (3) + Missed opportunities (8)
- **Estimated scope**: 3 files, ~40 lines

## Problem

**1. The twelve bento cards have hover feedback but no press feedback.**

```tsx
{/* app/dashboard/page.tsx:374-383 — current */}
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

Spread onto all 12 cards (`{...hoverProps}` at `app/dashboard/page.tsx:546, 565, 586, 636, 678, 708, 737, 788, 832, 861, 885, 918`). The cards lift on hover and then… nothing on click. AUDIT §3 hunt list: "pressable elements with no press feedback." The section buttons already do this correctly (`hover:scale-105 active:scale-95`, e.g. `app/dashboard/components/ContentSection.tsx:316`) — which is exactly what makes the primary surfaces feel unfinished by comparison.

**2. The dashboard To-Do row gives zero acknowledgement on click.**

```tsx
{/* app/dashboard/page.tsx:806-821 — current */}
<span style={{
  marginTop: 1, width: 16, height: 16, borderRadius: 6, flexShrink: 0,
  border: `1.5px solid ${sectionColors.todos}`,
  transition: "all 0.2s ease",
}} />
```

Two defects at once: the `transition` is **inert** (that span's `border` and `background` are constants — there is no `t.done` branch and no checkmark), and because `todosSorted` is open-only (`app/dashboard/page.tsx:241`, `const todosOpen = todos.filter(t=>!t.done)`), clicking a row makes it **vanish on the same frame**. If it was the last one, the whole list is replaced by "All clear — nothing open." (`:800-803`). AUDIT §8: "state changes that teleport… where a brief transition would prevent a jarring change."

**3. `TodosSection` ticks the aggregate, not the thing you clicked.** `TodosSection.tsx:156` animates the progress bar for 500ms while the checkbox the user actually pressed swaps `border` + `background` + glyph instantly (`TodosSection.tsx:256-265`). AUDIT §1/§8: feedback belongs on direct manipulation first.

## Target

**1. Add press feedback to the cards** via a local pressed-index state, so a click visibly lands:

```tsx
{/* app/dashboard/page.tsx — target */}
const [pressedCard, setPressedCard] = useState<string | null>(null);

const hoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => { /* unchanged from current */ },
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => { /* unchanged from current */ },
};
```

Each card's outer `style` gains a conditional transform, and each gets press handlers:

```tsx
{/* applied to each of the 12 card elements */}
onPointerDown={() => setPressedCard("finances")}
onPointerUp={() => setPressedCard(null)}
onPointerLeave={() => setPressedCard(null)}
style={{
  …,
  transform: pressedCard === "finances" ? "scale(0.97)" : undefined,
  transition: "transform 160ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms cubic-bezier(0.22, 1, 0.36, 1)",
}}
```

`scale(0.97)` at 160ms is the AUDIT §3 press-feedback target. Note that `hoverProps.onMouseEnter` *imperatively* sets `style.transform`, which would fight a React-set `transform`. **Resolve this explicitly**: either move the hover lift fully into the React `style` (preferred — one source of truth per property), or drop `transform` from the press state and use only `box-shadow` for the press. Do not leave two writers on `transform`.

**2. Make the to-do row acknowledge the click.** Add a short completion tick before the row leaves the list:

```tsx
{/* app/dashboard/page.tsx — target, near the todo row */}
const [tickingId, setTickingId] = useState<string | null>(null);

onClick={(e) => {
  e.stopPropagation();
  setTickingId(t._id);
  window.setTimeout(() => {
    toggleTodo({ id: t._id, done: !t.done });
    setTickingId(null);
  }, 160);
}}
```

And render a real checkbox with fill + tick:

```tsx
{/* app/dashboard/page.tsx — target, replacing the inert span */}
<span style={{
  marginTop: 1, width: 16, height: 16, borderRadius: 6, flexShrink: 0,
  border: `1.5px solid ${sectionColors.todos}`,
  background: tickingId === t._id ? sectionColors.todos : "transparent",
  transition: "background-color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1)",
}} />
```

> 160ms is the AUDIT §2 press budget. Keep it at or under 160ms so the list still feels immediate — this is a *tick*, not an exit animation. Do **not** animate the row's removal; an unmount animation here would need a latch on a filtered list and is not worth the complexity.

**3. `TodosSection.tsx`** — narrow the aggregate bar and give the row tick a transition. Change `transition-all duration-500` (`:156`) to `transition: "width 300ms var(--ease-out)"`, and convert the row checkbox glyph (`:256-265`) from a text child to a `<span>` with opacity/scale, mirroring plan 005's target for `TodosMemberPanel.tsx:411`.

## Repo conventions to follow

- Buttons already use Tailwind's `active:scale-95` (`ContentSection.tsx:316`). The cards are plain divs with inline styles, so they need the state-based approach above — do not convert the cards to buttons or restructure them.
- `useState` + handlers is the established pattern for interactive elements in `page.tsx` (e.g. `netWorthHidden`, `closeTimer`).

## Steps

1. `app/dashboard/page.tsx` — add `pressedCard` state near the other UI state (around lines 122-128).
2. `app/dashboard/page.tsx` — resolve the `transform` ownership conflict in `hoverProps` (see Target 1). Decide and document which mechanism owns `transform`.
3. `app/dashboard/page.tsx` — add press handlers + conditional press transform + 160ms transition to each of the 12 card elements at :546, :565, :586, :636, :678, :708, :737, :788, :832, :861, :885, :918. Keep each card's existing background, radius, and padding untouched.
4. `app/dashboard/page.tsx` — add `tickingId` state and the 160ms delayed toggle to the todo row click handler (around :807).
5. `app/dashboard/page.tsx` — replace the inert checkbox span (around :811-815) with the Target version.
6. `app/dashboard/components/TodosSection.tsx:156` — narrow `transition-all duration-500` to `transition: "width 300ms var(--ease-out)"`.
7. `app/dashboard/components/TodosSection.tsx:256-265` — convert the checkbox glyph to an animatable `<span>` with a 160ms transition, mirroring plan 005.

## Boundaries

- Do NOT restructure the card markup or convert divs to buttons.
- Do NOT animate row removal / list reflow — the row still disappears immediately after the 160ms tick.
- Do NOT change card colours, radii, padding, or the grid.
- Do NOT change the todo filtering logic (`todosOpen`, `todosSorted`) or any Convex call signature.
- Do NOT touch `TodosMemberPanel.tsx:411` — plan 005 owns it, and step 7 above only mirrors its pattern for `TodosSection.tsx`.
- Do NOT add dependencies.
- If the cited lines do not match, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0) and `npm run build` (expect exit 0).
- **Deterministic checks**:
  ```bash
  grep -n '"all 0.2s ease"' app/dashboard/page.tsx        # expect 0 in the todo row
  grep -n "duration-500" app/dashboard/components/TodosSection.tsx   # expect 0
  ```
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm:
  - **Press a card**: it visibly compresses and releases. Press and hold — it must stay compressed while held.
  - Hover a card, then press it: the hover lift and press compression must not fight or flicker. This is the highest-risk regression.
  - **Click a to-do**: the checkbox fills and shows a tick for ~160ms, then the row leaves and the list closes up. It should feel acknowledged, not delayed.
  - Complete the **last** open to-do and confirm the "All clear" state appears without a jarring flash.
  - Open the To-Do full-view panel and confirm its rows still reorder/toggle correctly and the header progress bar still animates.
- **Done when**: cards visibly respond to press, to-dos acknowledge the click before leaving, and no transform conflict or flicker appears on hover-then-press.

## Known uncertainty

The 160ms tick delays the actual mutation by 160ms. If a user rapid-clicks three to-dos, three independent timeouts fire — each is idempotent per row, so this is safe, but confirm rapid clicking does not double-toggle a single row. If it does, guard with a `useRef<Set<string>>` of in-flight ids.
