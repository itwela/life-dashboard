// convex/http.ts (life-dashboard)
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/jobLeads/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const syncKey = request.headers.get("X-Sync-Key");
    if (!syncKey || syncKey !== process.env.JOB_LEADS_SYNC_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Invalid sync key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { action, sourceLeadId, company, role, sourceType, status, isFollowUp, emailReceivedAt, accountEmail } = body;

    // JobKompass sends { action: "delete", sourceLeadId } when a lead is deleted there,
    // so its mirror row here doesn't linger as an orphan.
    if (action === "delete") {
      if (!sourceLeadId) {
        return new Response(JSON.stringify({ success: false, error: "Missing sourceLeadId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await ctx.runMutation(internal.jobLeads.deleteBySourceId, { sourceLeadId });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!sourceLeadId || !company || !role || !sourceType || !status) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await ctx.runMutation(internal.jobLeads.upsertFromSync, {
      sourceLeadId,
      company,
      role,
      sourceType,
      status,
      isFollowUp,
      emailReceivedAt: typeof emailReceivedAt === "number" ? emailReceivedAt : undefined,
      accountEmail: typeof accountEmail === "string" ? accountEmail : undefined,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
