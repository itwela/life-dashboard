"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free";

const SYSTEM_PROMPT = `You are an assistant for a life dashboard. The user will ask you to add or update things. Respond with ONLY a JSON object (no markdown, no extra text) with this shape:
{ "actions": [ { "action": "<name>", "payload": { ... } } ] }

Supported actions and payloads (use exact keys, numbers for numeric fields):
- add_workout: { "exerciseType": string, "duration": number, "notes": optional string, "date": optional number (ms, for specific day) }
- add_account: { "name": string, "type": "checking"|"savings"|"investment"|"debt"|"other", "balance": number }
- add_transaction: { "label": string, "amount": number, "type": "income"|"expense", "category": string (default "General") }
- add_book: { "title": string, "author": string, "status": "want_to_read"|"reading"|"completed", "notes": optional string }
- add_content: { "title": string, "platform": string, "type": "beat"|"video"|"article"|"other", "status": "idea"|"in_progress"|"published" }
- add_project: { "name": string, "description": optional string, "status": "active"|"paused"|"shipped", "revenue": optional number, "notes": optional string }
- set_school_progress: { "totalCU": number, "earnedCU": number, "activeCount": number, "termsCompleted": number, "termsTotal": number }
- add_missed_day: { "date": number } — date = start of day in ms (user's timezone)
- remove_missed_day: { "date": number }
- add_accounts_bulk: { "accounts": [ { "name": string, "type": "checking"|"savings"|"investment"|"debt"|"other", "balance": number } ] } — for multiple accounts in one message

If the user says multiple things (e.g. "add chase 500 and amex debt 1200"), use multiple actions or add_accounts_bulk.
If unclear or just chat, return { "actions": [] }.
Today's date for "today" or "this morning": use current day start in UTC for date fields if needed.`;

type ActionItem = { action: string; payload: Record<string, unknown> };

export const chat = action({
  args: {
    message: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { message, model: modelArg }): Promise<{ success: boolean; text: string }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, text: "OpenRouter API key not set. Add OPENROUTER_API_KEY in Convex → Environment Variables." };
    }
    const model = modelArg ?? process.env.OPENROUTER_FINANCE_MODEL ?? DEFAULT_MODEL;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, text: `OpenRouter error: ${res.status} ${err.slice(0, 200)}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { success: false, text: "No response from model." };
    let parsed: { actions?: ActionItem[] };
    try {
      const json = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(json) as { actions?: ActionItem[] };
    } catch {
      return { success: false, text: "Could not parse model response. Try: 'Log a 30 min run', 'Add Chase checking $500', 'I finished reading Clean Code'." };
    }
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const results: string[] = [];
    for (const { action: act, payload } of actions) {
      if (!payload || typeof payload !== "object") continue;
      try {
        switch (act) {
          case "add_workout": {
            const p = payload as { exerciseType?: string; duration?: number; notes?: string; date?: number };
            await ctx.runMutation(api.dashboard.logWorkout, {
              exerciseType: String(p.exerciseType ?? "Workout"),
              duration: Number(p.duration) || 0,
              notes: p.notes != null ? String(p.notes) : undefined,
              date: typeof p.date === "number" ? p.date : undefined,
            });
            results.push(`Logged workout: ${p.exerciseType ?? "Workout"} ${p.duration ?? 0} min`);
            break;
          }
          case "add_account": {
            const p = payload as { name?: string; type?: string; balance?: number };
            const type = ["checking", "savings", "investment", "debt", "other"].includes(String(p.type)) ? p.type : "other";
            await ctx.runMutation(api.dashboard.upsertAccount, {
              name: String(p.name ?? "Account"),
              type: type as "checking" | "savings" | "investment" | "debt" | "other",
              balance: Number(p.balance) || 0,
            });
            results.push(`Added account: ${p.name ?? "Account"} (${type}) $${Number(p.balance) || 0}`);
            break;
          }
          case "add_transaction": {
            const p = payload as { label?: string; amount?: number; type?: string; category?: string };
            const txType = p.type === "income" ? "income" : "expense";
            await ctx.runMutation(api.dashboard.addTransaction, {
              label: String(p.label ?? ""),
              amount: Number(p.amount) || 0,
              type: txType,
              category: String(p.category ?? "General"),
            });
            results.push(`Logged ${txType}: ${p.label ?? ""} $${Number(p.amount) || 0}`);
            break;
          }
          case "add_book": {
            const p = payload as { title?: string; author?: string; status?: string; notes?: string };
            const status = ["want_to_read", "reading", "completed"].includes(String(p.status)) ? p.status : "want_to_read";
            await ctx.runMutation(api.dashboard.upsertBook, {
              title: String(p.title ?? "Untitled"),
              author: String(p.author ?? "Unknown"),
              status: status as "want_to_read" | "reading" | "completed",
              notes: p.notes != null ? String(p.notes) : undefined,
            });
            results.push(`Added book: ${p.title ?? "Untitled"} (${status})`);
            break;
          }
          case "add_content": {
            const p = payload as { title?: string; platform?: string; type?: string; status?: string };
            const type = ["beat", "video", "article", "other"].includes(String(p.type)) ? p.type : "other";
            const status = ["idea", "in_progress", "published"].includes(String(p.status)) ? p.status : "idea";
            await ctx.runMutation(api.dashboard.addContentPost, {
              title: String(p.title ?? ""),
              platform: String(p.platform ?? "Other"),
              type: type as "beat" | "video" | "article" | "other",
              status: status as "idea" | "in_progress" | "published",
            });
            results.push(`Added content: ${p.title ?? ""} (${status})`);
            break;
          }
          case "add_project": {
            const p = payload as { name?: string; description?: string; status?: string; revenue?: number; notes?: string };
            const status = ["active", "paused", "shipped"].includes(String(p.status)) ? p.status : "active";
            await ctx.runMutation(api.dashboard.upsertProject, {
              name: String(p.name ?? "Project"),
              description: p.description != null ? String(p.description) : undefined,
              status: status as "active" | "paused" | "shipped",
              revenue: typeof p.revenue === "number" ? p.revenue : 0,
              notes: p.notes != null ? String(p.notes) : undefined,
            });
            results.push(`Added project: ${p.name ?? "Project"} (${status})`);
            break;
          }
          case "set_school_progress": {
            const p = payload as { totalCU?: number; earnedCU?: number; activeCount?: number; termsCompleted?: number; termsTotal?: number };
            await ctx.runMutation(api.dashboard.setSchoolProgress, {
              totalCU: Number(p.totalCU) || 120,
              earnedCU: Number(p.earnedCU) || 0,
              activeCount: Number(p.activeCount) || 0,
              termsCompleted: Number(p.termsCompleted) || 0,
              termsTotal: Number(p.termsTotal) || 11,
            });
            results.push("Updated school progress.");
            break;
          }
          case "add_missed_day": {
            const p = payload as { date?: number };
            const date = Number(p.date);
            if (Number.isFinite(date)) {
              await ctx.runMutation(api.dashboard.addMissedDay, { date });
              results.push("Marked day as missed.");
            }
            break;
          }
          case "remove_missed_day": {
            const p = payload as { date?: number };
            const date = Number(p.date);
            if (Number.isFinite(date)) {
              await ctx.runMutation(api.dashboard.removeMissedDay, { date });
              results.push("Unmarked missed day.");
            }
            break;
          }
          case "add_accounts_bulk": {
            const p = payload as { accounts?: Array<{ name?: string; type?: string; balance?: number }> };
            const list = Array.isArray(p.accounts) ? p.accounts : [];
            const accounts = list
              .filter((a) => a && typeof a === "object")
              .map((a) => ({
                name: String(a.name ?? "Account"),
                type: ["checking", "savings", "investment", "debt", "other"].includes(String(a.type)) ? (a.type as "checking" | "savings" | "investment" | "debt" | "other") : "other" as const,
                balance: Number(a.balance) || 0,
              }));
            if (accounts.length > 0) {
              await ctx.runMutation(internal.dashboard.upsertAccountsFromDump, { accounts });
              results.push(`Added/updated ${accounts.length} account(s).`);
            }
            break;
          }
          default:
            break;
        }
      } catch (e) {
        results.push(`Failed ${act}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (results.length === 0 && actions.length === 0) {
      return { success: true, text: "I didn't catch that. Try: 'Log a 30 min run', 'Add Chase checking $500', 'Add book Clean Code by Robert Martin', 'I finished reading X'." };
    }
    if (results.length === 0) {
      return { success: true, text: "No actions taken. Try being specific: 'Log 30 min run', 'Add savings account $2000'." };
    }
    return { success: true, text: results.join("\n") };
  },
});
