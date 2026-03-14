"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const ACCOUNT_TYPES = ["checking", "savings", "investment", "debt", "other"] as const;

const DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free";

const SYSTEM_PROMPT = `You extract financial accounts and debts from casual text. Return ONLY a JSON array of objects. Each object has: "name" (string, short label for the account or debt), "type" (one of: checking, savings, investment, debt, other), "balance" (number, always positive - for debts it's the amount owed). Ignore transactions; only accounts and current balances. Examples:
- "chase checking 500, savings 2k" -> [{"name":"Chase checking","type":"checking","balance":500},{"name":"Savings","type":"savings","balance":2000}]
- "I owe 1200 on amex" -> [{"name":"Amex","type":"debt","balance":1200}]
- "bofa checking has 3000, discover card debt 500" -> [{"name":"BofA checking","type":"checking","balance":3000},{"name":"Discover card","type":"debt","balance":500}]
Return only the JSON array, no other text.`;

export const parseFinanceDump = action({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { text, model: modelArg }): Promise<{ updated: number; message?: string }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { updated: 0, message: "OpenRouter API key not set. Add OPENROUTER_API_KEY in Convex dashboard → Environment Variables." };
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
          { role: "user", content: text },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("No response from OpenRouter");
    let parsed: unknown;
    try {
      const json = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(json);
    } catch {
      throw new Error("Could not parse model response as JSON");
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { updated: 0, message: "No accounts or debts found in that text." };
    }
    const accounts: { name: string; type: "checking" | "savings" | "investment" | "debt" | "other"; balance: number }[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object" || !('name' in item) || !('type' in item) || !('balance' in item)) continue;
      const name = String((item as { name?: unknown }).name ?? "").trim();
      const typeRaw = String((item as { type?: unknown }).type ?? "other").toLowerCase();
      const type = ACCOUNT_TYPES.includes(typeRaw as (typeof ACCOUNT_TYPES)[number])
        ? (typeRaw as (typeof ACCOUNT_TYPES)[number])
        : "other";
      const balance = Number((item as { balance?: unknown }).balance);
      if (!name || !Number.isFinite(balance) || balance < 0) continue;
      accounts.push({ name, type, balance });
    }
    if (accounts.length === 0) {
      return { updated: 0, message: "No valid accounts parsed. Try: 'Chase checking 500, Amex debt 1200'" };
    }
    const updated = await ctx.runMutation(internal.dashboard.upsertAccountsFromDump, { accounts });
    return { updated, message: `Updated ${updated} account(s).` };
  },
});
