// components/JobLeadsFeed.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function JobLeadsFeed() {
  const leads = useQuery(api.jobLeads.list, {});

  if (leads === undefined) return <div>Loading...</div>;
  if (leads.length === 0) return <div className="text-sm text-muted-foreground">No job leads yet.</div>;

  const sorted = [...leads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="space-y-2">
      {sorted.slice(0, 20).map((lead) => (
        <div key={lead._id} className="flex justify-between text-sm border-b py-1">
          <span>
            {lead.company} — {lead.role}
          </span>
          <span className="text-muted-foreground">{lead.status}</span>
        </div>
      ))}
    </div>
  );
}
