import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything except the sign-in/sign-up routes requires a signed-in user.
// Combined with sign-ups disabled on the Clerk instance, only Itwela's pre-created
// account can get in — the whole dashboard is private.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|eot)).*)",
    "/(api|trpc)(.*)",
  ],
};
