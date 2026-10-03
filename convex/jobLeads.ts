// convex/jobLeads.ts (life-dashboard)
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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
      // `archived` and `archivedAt` are not in args, so this patch leaves them
      // untouched. A resync must not un-archive a lead filed away on the dashboard.
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
    } else {
      await ctx.db.insert("jobLeads", { ...args, updatedAt: now });
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Returns archived rows too (with `archived: true`) so CLI inspection still
    // sees them. The dashboard hides archived leads itself.
    return await ctx.db.query("jobLeads").collect();
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;

function leadActivityAt(lead: { emailReceivedAt?: number; updatedAt: number }) {
  return lead.emailReceivedAt ?? lead.updatedAt;
}

/**
 * Archive or unarchive one lead. The row is kept either way.
 * CLI: npx convex run jobLeads:setArchived '{"id":"<jobLeads id>","archived":true}'
 */
export const setArchived = mutation({
  args: { id: v.id("jobLeads"), archived: v.boolean() },
  handler: async (ctx, { id, archived }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return { archived };
    await ctx.db.patch(id, {
      archived,
      archivedAt: archived ? Date.now() : undefined,
    });
    return { archived };
  },
});

/**
 * Archive leads whose activity is at least `olderThanDays` old.
 * Activity is `emailReceivedAt` when the sync stored one, otherwise `updatedAt`,
 * so a sync that only refreshes `updatedAt` does not make an old email look new.
 * Already-archived rows are skipped. Nothing is deleted.
 *
 * `statuses`, when a non-empty list, limits the match to those exact status strings.
 * `dryRun: true` counts matches and writes nothing.
 *
 * CLI:
 *   npx convex run jobLeads:archiveStale '{"olderThanDays":60,"dryRun":true}'
 *   npx convex run jobLeads:archiveStale '{"olderThanDays":60,"statuses":["extracted","new","closed"]}'
 */
export const archiveStale = mutation({
  args: {
    olderThanDays: v.number(),
    statuses: v.optional(v.array(v.string())),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { olderThanDays, statuses, dryRun }) => {
    if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
      throw new Error("olderThanDays must be a non-negative number");
    }
    const cutoff = Date.now() - olderThanDays * DAY_MS;
    const statusSet = statuses && statuses.length > 0 ? new Set(statuses) : null;
    const rows = await ctx.db.query("jobLeads").collect();
    const matches = rows.filter((row) => {
      if (row.archived) return false;
      if (leadActivityAt(row) > cutoff) return false;
      if (statusSet && !statusSet.has(row.status)) return false;
      return true;
    });
    if (!dryRun) {
      const now = Date.now();
      for (const row of matches) {
        await ctx.db.patch(row._id, { archived: true, archivedAt: now });
      }
    }
    const byStatus: Record<string, number> = {};
    for (const row of matches) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    return {
      dryRun: !!dryRun,
      olderThanDays,
      statuses: statuses ?? [],
      matched: matches.length,
      archived: dryRun ? 0 : matches.length,
      byStatus,
    };
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
