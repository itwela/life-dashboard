import { useEffect, useRef, useState } from "react";

/**
 * Mount latch for exit animations.
 *
 * A panel that unmounts the instant its open flag flips false cannot animate
 * out — React removes the node mid-frame. The latch keeps the node mounted for
 * exactly as long as the CSS transition needs, then releases it.
 *
 * This module is deliberately pure (no React, no DOM) so the timing logic is
 * unit-testable without a browser; `useMountLatch` in ../hooks is the thin React
 * binding over it.
 */

/** Must match the `.modal-panel` transition duration in app/globals.css. */
export const PANEL_TRANSITION_MS = 500;

export interface LatchEvent {
  type:
    | "opened" // open flag went false → true: mount immediately
    | "closed" // open flag went true → false: begin the exit
    | "exitElapsed"; // the exit timer fired: safe to unmount
}

export interface LatchState {
  /** Whether the node should be in the DOM at all. */
  mounted: boolean;
  /** Passed to `data-open`; drives the open/closed CSS state. */
  open: boolean;
  /** Whether this state change requires scheduling an exit timer. */
  scheduleUnmount: boolean;
}

export const INITIAL_LATCH: LatchState = {
  mounted: false,
  open: false,
  scheduleUnmount: false,
};

/**
 * The latch state machine. Pure: same input + event always yields the same
 * output, so every branch below is directly testable.
 *
 * Transitions:
 *   closed → open   : mounted=true,  open=true   (enter transition runs)
 *   open   → closed : mounted stays true, open=false, scheduleUnmount=true
 *   exitElapsed     : mounted=false, open=false  WARNING: only valid if still closed
 */
export function latchReducer(state: LatchState, event: LatchEvent): LatchState {
  switch (event.type) {
    case "opened":
      return { mounted: true, open: true, scheduleUnmount: false };

    case "closed":
      // Already unmounted: nothing to animate out.
      if (!state.mounted) return INITIAL_LATCH;
      return { mounted: true, open: false, scheduleUnmount: true };

    case "exitElapsed": {
      // Re-opened during the exit window — the close is stale, keep it mounted.
      // This is the race that makes naive implementations flicker.
      if (state.open) return { ...state, scheduleUnmount: false };
      return INITIAL_LATCH;
    }

    default:
      return state;
  }
}

/**
 * How long to wait before unmounting. Mirrors the CSS duration; kept as a
 * function so a test asserts it is not accidentally zero.
 */
export function exitDelayMs(): number {
  return PANEL_TRANSITION_MS;
}

// ── React binding ─────────────────────────────────────────────────────────────
// Kept as thin as possible: all decision-making lives in `latchReducer` above,
// which is what the tests exercise. This part only wires timers to events.

export interface MountLatch {
  /** Render the panel only when true. */
  mounted: boolean;
  /** Spread onto the panel element: `data-open={open}`. */
  open: boolean;
}

/**
 * Keeps a panel mounted long enough to animate out.
 *
 * @param isOpen the existing boolean the call sites already toggle
 *
 * Ordering matters: the open flag flips to true only *after* the browser has
 * painted the closed state, otherwise both states are applied in the same
 * frame and the transition is skipped entirely.
 */
export function useMountLatch(isOpen: boolean): MountLatch {
  const [state, setState] = useState<LatchState>(INITIAL_LATCH);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (isOpen) {
      setState((s) => latchReducer(s, { type: "opened" }));
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() =>
          setState((s) => latchReducer(s, { type: "opened" })),
        );
      });
      return () => cancelAnimationFrame(raf);
    }

    // Closing: keep the node mounted, then release after the transition.
    setState((s) => latchReducer(s, { type: "closed" }));
    const timer = window.setTimeout(() => {
      setState((s) => latchReducer(s, { type: "exitElapsed" }));
    }, exitDelayMs());
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  return { mounted: state.mounted, open: state.open };
}
