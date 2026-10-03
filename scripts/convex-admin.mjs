// Run an internal Convex function with the deploy key.
// Public functions require a Clerk session; `npx convex run module:nameAdmin` does not.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const convexBin = join(root, "node_modules", ".bin", "convex");

export function convexRun(functionName, args = {}) {
  const cliArgs = [
    "run",
    functionName,
    JSON.stringify(args ?? {}),
    "--codegen",
    "disable",
    "--typecheck",
    "disable",
  ];
  if (process.env.CONVEX_PROD === "1") cliArgs.push("--prod");

  const stdout = execFileSync(convexBin, cliArgs, {
    encoding: "utf8",
    cwd: root,
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 32 * 1024 * 1024,
  });
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}
