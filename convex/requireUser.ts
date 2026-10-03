import type { UserIdentity } from "convex/server";

/**
 * Emails allowed to call public Convex functions.
 * Override with the Convex env var ALLOWED_EMAILS (comma-separated).
 * That variable belongs on the Convex deployment, not in the browser.
 */
const DEFAULT_ALLOWED_EMAILS = [
  "deanandnostrand@gmail.com",
  "citwela@gmail.com",
];

export function allowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS;
  const source = raw && raw.trim() ? raw : DEFAULT_ALLOWED_EMAILS.join(",");
  return new Set(
    source
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function emailFromIdentity(identity: UserIdentity): string | null {
  const record = identity as UserIdentity & { emailAddress?: string };
  const raw = record.email ?? record.emailAddress;
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

type AuthContext = {
  auth: { getUserIdentity: () => Promise<UserIdentity | null> };
};

/**
 * Reject public callers who are not an allowlisted Clerk user.
 * Internal / admin functions do not call this — `npx convex run` has no Clerk identity.
 */
export async function requireAllowedUser(ctx: AuthContext): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const email = emailFromIdentity(identity);
  if (!email) {
    throw new Error(
      "Not authorized: Clerk session is missing an email claim. Add email to the Clerk session token."
    );
  }
  if (!allowedEmails().has(email)) {
    throw new Error("Not authorized");
  }
  return identity;
}
