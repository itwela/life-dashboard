// convex/jobLeads.ts (life-dashboard)
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const upsertFromSync = internalMutation({
  args: {
    sourceLeadId: v.string(),
    company: v.string(),
    role: v.string(),
    sourceType: v.union(v.literal("personal_outreach"), v.literal("digest_listing")),
    status: v.string(),
    isFollowUp: v.optional(v.boolean()),
    emailReceivedAt: v.optional(v.number()),
    accountEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobLeads")
      .withIndex("by_source_lead", (q) => q.eq("sourceLeadId", args.sourceLeadId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("jobLeads", { ...args, updatedAt: now });
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("jobLeads").collect();
  },
});

export const deleteBySourceId = internalMutation({
  args: { sourceLeadId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobLeads")
      .withIndex("by_source_lead", (q) => q.eq("sourceLeadId", args.sourceLeadId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Wipe the mirror. This table is a disposable read-only copy of JobKompass leads:
// after JobKompass deletes leads (e.g. resetUntriagedLeads), their mirror rows here
// become orphans. Run this, then `npx convex run emailAgent/mirror:pushAllLeads` on
// the JobKompass deployment to repopulate.
export const purgeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("jobLeads").collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { deleted: rows.length };
  },
});
