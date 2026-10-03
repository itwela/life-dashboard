import { v } from "convex/values";
import { exposeMutation, exposeQuery } from "./expose";

// Public check-in functions require an allowlisted Clerk user.
// CLI: npx convex run checkIns:addAdmin / listAdmin / getByDateAdmin
// New functions: use exposeQuery / exposeMutation from ./expose (not raw query/mutation).

const addFns = exposeMutation({
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
export const add = addFns.public;
export const addAdmin = addFns.admin;

const listFns = exposeQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("checkIns").collect();
  },
});
export const list = listFns.public;
export const listAdmin = listFns.admin;

const getByDateFns = exposeQuery({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("checkIns")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});
export const getByDate = getByDateFns.public;
export const getByDateAdmin = getByDateFns.admin;
