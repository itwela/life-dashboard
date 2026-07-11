// components/JobLeadsFeed.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function JobLeadsFeed() {
  const leads = useQuery(api.jobLeads.list, {});

  if (leads === undefined) return <div>Loading...</div>;
  if (leads.length === 0) return <div className="text-sm text-muted-foreground">No job leads yet.</div>;

  const sorted = [...leads].sort(
    (a, b) => (b.emailReceivedAt ?? b.updatedAt) - (a.emailReceivedAt ?? a.updatedAt)
  );

  return (
    <div className="space-y-2">
      {sorted.map((lead) => (
        <div key={lead._id} className="flex justify-between gap-3 text-sm border-b py-1">
          <span className="min-w-0 truncate">
            {lead.company} — {lead.role}
            {lead.accountEmail && (
              <span className="text-muted-foreground text-xs"> · {lead.accountEmail}</span>
            )}
          </span>
          <span className="flex items-center gap-3 shrink-0 text-muted-foreground">
            <span>
              {new Date(lead.emailReceivedAt ?? lead.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>{lead.status}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
