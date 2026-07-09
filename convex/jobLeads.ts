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
