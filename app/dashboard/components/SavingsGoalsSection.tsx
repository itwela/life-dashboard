"use client";

import { useState } from "react";
import { PiggyBank } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import AddModal, { FormField, FormInput, FormTextarea } from "./AddModal";

export const SAVINGS_ACCENT = "#0f9f6e";

export function formatDollars(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Percent of target, capped at 100. Null when the target is missing or not positive. */
export function savingsProgress(current: number, target: number | undefined): number | null {
  if (target == null || !(target > 0)) return null;
  const raw = (current / target) * 100;
  if (!Number.isFinite(raw)) return null;
  return Math.min(100, Math.max(0, raw));
}

function parseOptionalNumber(raw: string): number | null | "invalid" {
  const trimmed = raw.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

export function SavingsGoalMeter({
  goal,
  isDark,
  dense = false,
}: {
  goal: Doc<"savingsGoals">;
  isDark: boolean;
  dense?: boolean;
}) {
  const pct = savingsProgress(goal.current, goal.target);
  const textMain = isDark ? "#fff" : "#1a1a1a";
  const textMuted = isDark ? "#b0b0b0" : "#6b7280";
  const track = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const amount =
    goal.target == null
      ? `${formatDollars(goal.current)} · Target TBD`
      : `${formatDollars(goal.current)} / ${formatDollars(goal.target)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 4 : 6, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
        <span
          title={goal.name}
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: dense ? "0.8rem" : "0.95rem",
            fontWeight: 600,
            color: textMain,
            letterSpacing: "-0.02em",
          }}
        >
          {goal.name}
        </span>
        {pct != null && (
          <span style={{ flexShrink: 0, fontSize: dense ? "0.72rem" : "0.8rem", fontWeight: 700, color: SAVINGS_ACCENT, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(pct)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: dense ? "0.72rem" : "0.8rem", color: textMuted, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
        {amount}
      </div>
      {pct != null && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={`${goal.name} progress`}
          style={{ height: dense ? 6 : 8, borderRadius: 100, background: track, overflow: "hidden" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 100,
              background: SAVINGS_ACCENT,
              transform: `scaleX(${pct / 100})`,
              transformOrigin: "left center",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function SavingsGoalsCardBody({
  goals,
  isDark,
}: {
  goals: Doc<"savingsGoals">[];
  isDark: boolean;
}) {
  const textMuted = isDark ? "#b0b0b0" : "#6b7280";
  if (goals.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "0.8rem", color: textMuted, padding: "8px 4px" }}>
        No goals yet. Tap to add one.
      </div>
    );
  }
  return (
    <div
      className="hide-scrollbar"
      onWheel={(e) => e.stopPropagation()}
      style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}
    >
      {goals.map((goal) => (
        <SavingsGoalMeter key={goal._id} goal={goal} isDark={isDark} dense />
      ))}
    </div>
  );
}

interface Props {
  goals: Doc<"savingsGoals">[];
  addSavingsGoal: (args: {
    name: string;
    target?: number;
    current?: number;
    notes?: string;
  }) => Promise<unknown>;
  updateSavingsGoal: (args: {
    id: Id<"savingsGoals">;
    name?: string;
    target?: number | null;
    current?: number;
    notes?: string | null;
  }) => Promise<unknown>;
  deleteSavingsGoal: (args: { id: Id<"savingsGoals"> }) => Promise<unknown>;
  isDark?: boolean;
}

export default function SavingsGoalsSection({
  goals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  isDark = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"savingsGoals"> | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"savingsGoals"> | null>(null);
  const [confirmModalDelete, setConfirmModalDelete] = useState(false);

  const textMain = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text30 = isDark ? "text-white/30" : "text-black/30";
  const muted = isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.55)";
  const softFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const softBorder = isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)";
  const cardFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)";

  const saved = goals.reduce((sum, goal) => sum + goal.current, 0);
  const targeted = goals.filter((goal) => goal.target != null && goal.target > 0);
  const targetSum = targeted.reduce((sum, goal) => sum + (goal.target ?? 0), 0);
  const savedToward = targeted.reduce((sum, goal) => {
    const cap = goal.target ?? 0;
    return sum + Math.min(Math.max(goal.current, 0), cap);
  }, 0);
  const overall = targetSum > 0 ? Math.min(100, Math.max(0, (savedToward / targetSum) * 100)) : null;

  function openAdd() {
    setEditing(null);
    setConfirmModalDelete(false);
    setName("");
    setTarget("");
    setCurrent("0");
    setNotes("");
    setError(null);
    setOpen(true);
  }

  function openEdit(goal: Doc<"savingsGoals">) {
    setEditing(goal);
    setConfirmModalDelete(false);
    setName(goal.name);
    setTarget(goal.target == null ? "" : String(goal.target));
    setCurrent(String(goal.current));
    setNotes(goal.notes ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleDelete(id: Id<"savingsGoals">) {
    await deleteSavingsGoal({ id });
    setPendingDeleteId(null);
    setConfirmModalDelete(false);
    setOpen(false);
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    const parsedTarget = parseOptionalNumber(target);
    const parsedCurrent = parseOptionalNumber(current);
    if (parsedTarget === "invalid" || parsedCurrent === "invalid") {
      setError("Enter a valid number, or leave target blank");
      return;
    }
    const currentValue = parsedCurrent ?? 0;
    const trimmedNotes = notes.trim();
    setError(null);
    if (editing) {
      await updateSavingsGoal({
        id: editing._id,
        name: trimmedName,
        target: parsedTarget,
        current: currentValue,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      });
    } else {
      await addSavingsGoal({
        name: trimmedName,
        current: currentValue,
        ...(parsedTarget != null ? { target: parsedTarget } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
    }
    setOpen(false);
  }

  return (
    <div
      className="md:h-full rounded-[28px] p-4 sm:p-8 flex flex-col md:overflow-hidden relative"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(15,159,110,0.16) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(15,159,110,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(15,159,110,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(15,159,110,0.14) 0%, transparent 70%)" }} />

      <div className="shrink-0 flex items-start sm:items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(15,159,110,0.32), rgba(6,95,70,0.15))", border: "1px solid rgba(15,159,110,0.4)", boxShadow: "0 0 16px rgba(15,159,110,0.28)" }}
          >
            <PiggyBank size={18} color={SAVINGS_ACCENT} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-sm font-bold ${textMain}`}>Savings Goals</h2>
            <p className={`text-xs ${text40}`}>Tap a goal to edit. Leave the target blank if it is still TBD.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95 shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(15,159,110,0.55), rgba(6,95,70,0.28))", border: "1px solid rgba(15,159,110,0.5)", boxShadow: "0 0 12px rgba(15,159,110,0.25)" }}
        >
          + New Goal
        </button>
      </div>

      <div className="shrink-0 rounded-xl p-4 mb-4" style={{ background: "linear-gradient(135deg, rgba(15,159,110,0.12), rgba(15,159,110,0.04))", border: "1px solid rgba(15,159,110,0.22)" }}>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className={`text-xs ${text40} uppercase tracking-widest`}>Saved so far</p>
            <p className="text-3xl sm:text-4xl font-black" style={{ color: SAVINGS_ACCENT, fontVariantNumeric: "tabular-nums" }}>
              {formatDollars(saved)}
            </p>
          </div>
          <p className="text-xs" style={{ color: muted }}>
            {goals.length === 1 ? "1 goal" : `${goals.length} goals`}
            {overall != null ? ` · ${Math.round(overall)}% of known targets` : ""}
          </p>
        </div>
        {overall != null && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: "100%", background: SAVINGS_ACCENT, transform: `scaleX(${overall / 100})`, transformOrigin: "left center" }} />
          </div>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className={`text-sm text-center ${text40}`}>No savings goals yet.</p>
        </div>
      ) : (
        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto space-y-2 pr-1">
          {goals.map((goal) => (
            <div
              key={goal._id}
              onClick={() => openEdit(goal)}
              className="rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform overflow-hidden flex"
              style={{ background: cardFill, border: cardBorder }}
            >
              <div style={{ width: 4, background: SAVINGS_ACCENT, flexShrink: 0 }} />
              <div className="flex-1 min-w-0 p-4">
                <SavingsGoalMeter goal={goal} isDark={isDark} />
                {goal.notes && (
                  <p className="text-xs leading-relaxed mt-2" style={{ color: muted, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {goal.notes}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-2 mt-2" style={{ borderTop: softBorder }}>
                  {pendingDeleteId === goal._id ? (
                    <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px]" style={{ color: "#f87171" }}>Delete?</span>
                      <button
                        type="button"
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md text-white"
                        style={{ background: "#dc2626" }}
                        onClick={(e) => { e.stopPropagation(); void handleDelete(goal._id); }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ color: muted, border: softBorder }}
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); }}
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`text-[11px] font-semibold ${text30} hover:text-red-400`}
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(goal._id); }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddModal
        title={editing ? "Edit Goal" : "New Goal"}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => { void handleSubmit(); }}
        accentColor={SAVINGS_ACCENT}
        isDark={isDark}
        submitLabel={editing ? "Save" : "Add goal"}
      >
        <FormField label="Name" isDark={isDark}>
          <FormInput value={name} onChange={setName} placeholder="Goal name" isDark={isDark} />
        </FormField>
        <FormField label="Target ($)" isDark={isDark}>
          <FormInput value={target} onChange={setTarget} type="text" placeholder="Leave blank if TBD" isDark={isDark} />
        </FormField>
        <FormField label="Current ($)" isDark={isDark}>
          <FormInput value={current} onChange={setCurrent} type="text" placeholder="0" isDark={isDark} />
        </FormField>
        <FormField label="Notes (optional)" isDark={isDark}>
          <FormTextarea value={notes} onChange={setNotes} placeholder="Why this goal, or where the money lives" rows={3} isDark={isDark} />
        </FormField>
        {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
        {editing && (
          confirmModalDelete ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs" style={{ color: "#f87171" }}>Delete “{editing.name}”?</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" className={`text-xs font-semibold px-2 py-1 rounded-lg ${text40}`} onClick={() => setConfirmModalDelete(false)}>Cancel</button>
                <button type="button" className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ background: "#dc2626" }} onClick={() => void handleDelete(editing._id)}>Delete</button>
              </div>
            </div>
          ) : (
            <button type="button" className="text-xs font-semibold text-left" style={{ color: "#f87171" }} onClick={() => setConfirmModalDelete(true)}>
              Delete goal
            </button>
          )
        )}
      </AddModal>
    </div>
  );
}
