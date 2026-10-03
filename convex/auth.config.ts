import type { AuthConfig } from "convex/server";

// Issuer is the Clerk Frontend API URL (no path, no trailing slash), set on the
// Convex deployment as CLERK_JWT_ISSUER_DOMAIN. applicationID "convex" matches
// the audience Clerk's Convex integration puts on the session token.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
