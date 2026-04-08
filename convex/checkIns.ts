import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const add = mutation({
  args: {
    date: v.string(),
    timeOfDay: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("night")),
    emotions: v.array(v.string()),
    journal: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Replace existing check-in for the same date if one exists
    const existing = await ctx.db
      .query("checkIns")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        timeOfDay: args.timeOfDay,
        emotions: args.emotions,
        journal: args.journal,
        tags: args.tags,
        createdAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("checkIns", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("checkIns").collect();
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkIns")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});
