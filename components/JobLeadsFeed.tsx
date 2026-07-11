// components/JobLeadsFeed.tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Search } from "lucide-react";

const ACCENT = "#4a90c4";

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "pending",
  sending: "sending",
  sent: "sent",
  followed_up: "followed up",
  replied: "replied",
  extracted: "listing",
  new: "new",
  promoted: "promoted",
  closed: "closed",
};

const STATUS_COLORS: Record<string, string> = {
  pending_approval: "#f59e0b",
  sending: "#3b82f6",
  sent: "#34d399",
  followed_up: "#34d399",
  replied: "#a78bfa",
  extracted: "#94a3b8",
  new: "#94a3b8",
  promoted: "#4a90c4",
  closed: "#6b7280",
};

type StatusFilter = "all" | "pending_approval" | "extracted" | "sent" | "replied";
type SourceFilter = "all" | "personal_outreach" | "digest_listing";

export function JobLeadsFeed({ isDark = true }: { isDark?: boolean }) {
  const leads = useQuery(api.jobLeads.list, {});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");

  const textMain = isDark ? "text-white" : "text-black";
  const text40 = isDark ? "text-white/40" : "text-black/40";
  const text60 = isDark ? "text-white/60" : "text-black/60";
  const rowFill = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const rowBorder = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)";
  const mutedText = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  if (leads === undefined) {
    return <div className={`text-sm ${text40}`}>Loading...</div>;
  }

  const pendingCount = leads.filter((l) => l.status === "pending_approval").length;

  const query = q.trim().toLowerCase();
  const statusMatches = (s: string) =>
    status === "all" ||
    (status === "sent" ? s === "sent" || s === "followed_up" : s === status);

  const visible = [...leads]
    .filter(
      (l) =>
        statusMatches(l.status) &&
        (source === "all" || l.sourceType === source) &&
        (!query ||
          l.company.toLowerCase().includes(query) ||
          l.role.toLowerCase().includes(query) ||
          (l.accountEmail ?? "").toLowerCase().includes(query))
    )
    .sort((a, b) => (b.emailReceivedAt ?? b.updatedAt) - (a.emailReceivedAt ?? a.updatedAt));

  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: "7px 12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    color: active ? "#fff" : mutedText,
    background: active ? ACCENT : "transparent",
    transition: "background 0.2s ease, color 0.2s ease",
  });

  return (
    <div
      className="h-full rounded-[28px] p-6 sm:p-8 flex flex-col overflow-hidden relative"
      style={{
        background: isDark
          ? "linear-gradient(155deg, rgba(74,144,196,0.14) 0%, rgba(22,22,27,0.99) 42%)"
          : "linear-gradient(155deg, rgba(74,144,196,0.10) 0%, #ffffff 42%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: isDark
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(74,144,196,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 30px 80px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg"
          style={{
            background: "linear-gradient(135deg, rgba(74,144,196,0.3), rgba(37,99,160,0.15))",
            border: "1px solid rgba(74,144,196,0.35)",
            boxShadow: "0 0 16px rgba(74,144,196,0.3)",
          }}
        >
          💼
        </div>
        <div className="flex-1">
          <h2 className={`text-lg font-bold ${textMain}`}>Job Leads</h2>
          <p className={`text-xs ${text40}`}>
            Scanned from Gmail by the JobKompass email agent
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: ACCENT }}>{leads.length}</p>
          <p className={`text-[11px] ${text40}`}>{pendingCount} pending approval</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: mutedText }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, role, inbox…"
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none ${textMain}`}
            style={{ background: rowFill, border: rowBorder }}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: rowBorder }}>
          {(
            [
              ["all", "All"],
              ["pending_approval", "Pending"],
              ["extracted", "Listings"],
              ["sent", "Sent"],
              ["replied", "Replied"],
            ] as [StatusFilter, string][]
          ).map(([key, label]) => (
            <button key={key} style={segBtn(status === key)} onClick={() => setStatus(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl overflow-hidden shrink-0" style={{ border: rowBorder }}>
          {(
            [
              ["all", "Both"],
              ["personal_outreach", "Outreach"],
              ["digest_listing", "Digests"],
            ] as [SourceFilter, string][]
          ).map(([key, label]) => (
            <button key={key} style={segBtn(source === key)} onClick={() => setSource(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
        {visible.length === 0 ? (
          <p className={`text-sm ${text40} py-6 text-center`}>
            {leads.length === 0 ? "No job leads yet." : "Nothing matches that filter."}
          </p>
        ) : (
          visible.map((lead) => {
            const color = STATUS_COLORS[lead.status] ?? "#94a3b8";
            return (
              <div
                key={lead._id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                style={{ background: rowFill, border: rowBorder }}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${textMain}`} title={`${lead.company} — ${lead.role}`}>
                    {lead.company}
                    <span className={`font-normal ${text60}`}> — {lead.role}</span>
                  </p>
                  <p className={`text-[11px] truncate ${text40}`}>
                    {lead.sourceType === "personal_outreach" ? "Direct outreach" : "Job digest"}
                    {lead.accountEmail ? ` · ${lead.accountEmail}` : ""}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
                >
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
                <span className={`shrink-0 text-xs tabular-nums ${text40}`} style={{ minWidth: 44, textAlign: "right" }}>
                  {new Date(lead.emailReceivedAt ?? lead.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
