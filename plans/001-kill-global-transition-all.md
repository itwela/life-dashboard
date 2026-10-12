# 001 — Stop the global button transition from animating every property

- **Status**: DONE
- **Commit**: 7c0b6ca
- **Severity**: HIGH
- **Category**: Performance (5) + Cohesion (7)
- **Estimated scope**: 2 files, ~15 lines

## Problem

`app/globals.css:13` defines the repo's only motion token, and `app/globals.css:129-131` applies it to **every `<button>` in the application**:

```css
/* app/globals.css:13 — current */
--transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);

/* app/globals.css:129-131 — current */
button, .card-hover {
  transition: var(--transition);
}
```

That expands to `transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1)`. Two separate defects:

1. **`transition: all`** — AUDIT §5: "`transition: all` animates unintended properties off-GPU — always a finding." Every property that ever changes on any button is transitioned, including layout properties in some children.
2. **400ms** — AUDIT §2 gives button press feedback a budget of **100–160ms**. 400ms is 3× over, and it is 2.7× the 150ms Tailwind default (`--default-transition-duration: 150ms` in `node_modules/tailwindcss/theme.css:492`) that every `transition-all`/`transition-colors` class in this repo already uses. So two timing systems coexist for the same controls.

`app/globals.css:112` applies the same token to `.nav-btn` (a class with no live consumers, but it should not stay wrong).

## Target

Split the single overloaded token into a curve token plus a duration scale, and narrow the global rule to the properties buttons actually animate.

```css
/* app/globals.css — target :root additions */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* keep the incumbent curve — see note */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--dur-press: 160ms;   /* buttons, press feedback */
--dur-fast: 200ms;    /* popovers, small state changes */
--dur-base: 300ms;    /* panels, larger state changes */
--dur-panel: 500ms;   /* modals */
```

```css
/* app/globals.css:129-131 — target */
button, .card-hover {
  transition-property: transform, background-color, border-color, color, box-shadow, opacity;
  transition-duration: var(--dur-press);
  transition-timing-function: var(--ease-out);
}
```

```css
/* app/globals.css:112 — target */
.nav-btn {
  transition-property: transform, background-color, border-color, color, box-shadow, opacity;
  transition-duration: var(--dur-press);
  transition-timing-function: var(--ease-out);
}
```

**Keep `--transition` defined** for now (one line) so nothing else breaks; a later plan can delete it once all consumers are migrated.

### Curve note (do not skip)

The incumbent curve `cubic-bezier(0.22, 1, 0.36, 1)` is a **near-miss** of the canonical AUDIT §2 `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` — it is not the same value. This plan deliberately **keeps the incumbent** to avoid an unrequested visual change across 9 sites, and names it `--ease-out` so it can be swapped in one place later. Do **not** silently change it to the canonical value in this plan.

## Repo conventions to follow

- Motion values belong in the `:root` block in `app/globals.css:3-14`, alongside `--glass-blur` and `--card-radius`. Add new tokens there, not in component files.
- The repo already uses strong custom curves rather than built-in `ease` for deliberate motion — the existing `.modal-panel-in` (`app/globals.css:198`) is the exemplar:
  ```css
  .modal-panel-in { animation: modal-panel-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
  ```

## Steps

1. In `app/globals.css`, inside `:root` (after line 13), add the five tokens exactly as written in **Target** above.
2. Replace the `button, .card-hover` rule at `app/globals.css:129-131` with the three-declaration longhand version from **Target**.
3. Replace the `transition: var(--transition);` declaration inside `.nav-btn` at `app/globals.css:112` with the same three longhand declarations from **Target**.
4. Leave `--transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);` on line 13 in place, unmodified.
5. Do **not** edit any `.tsx` file. The 27 inline `transition` sites are a separate concern.

## Boundaries

- Do NOT touch any `.tsx` file, including `app/dashboard/page.tsx` and the member panels.
- Do NOT change `.card-hover:hover` (`app/globals.css:134-139`) — a later plan owns the hover-lift work.
- Do NOT change `--transition`'s value or remove it.
- Do NOT change the curve value (see Curve note).
- Do NOT add dependencies.
- If `app/globals.css:112` / `:129-131` no longer match the code above, STOP and report drift instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` (expect exit 0 — CSS-only change) and `npm run build` (expect exit 0).
- **Deterministic check** — confirm `transition: all` is gone from the global layer:
  ```bash
  grep -n "transition: all\|transition: var(--transition)" app/globals.css
  ```
  Expected: no match on the `button`/`.card-hover`/`.nav-btn` rules (line 13's token definition may still match).
- **Feel check**: run `npm run dev`, open `/dashboard`, and confirm:
  - Hovering a bento card still lifts it, and the lift reads **noticeably snappier** than before (was 400ms).
  - Pressing any button in the full-view modals (e.g. Finances → a button) gives immediate feedback rather than a slow ramp.
  - Open DevTools → Animations panel, set playback to 10%, hover a card, and confirm only `transform` and `box-shadow` are listed as transitioning — not `width`, `margin`, or `padding`.
  - Toggle `prefers-reduced-motion: reduce` in the Rendering panel and confirm the card lift still moves (this plan does **not** add a reduced-motion gate; plan 004 does). Do not report the missing gate as a defect of this plan.
- **Done when**: the grep above is clean, the build passes, and a card hover visibly responds faster than before.

## Follow-ups this plan intentionally leaves open

- The 27 inline `transition: "all …"` sites in `.tsx` files (plan 003).
- Deleting `--transition` once its last consumer is migrated.
- Swapping `--ease-out` to the canonical `cubic-bezier(0.23, 1, 0.32, 1)` if the visual difference is ever wanted.
