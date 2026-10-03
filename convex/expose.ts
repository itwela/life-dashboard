import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type {
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import type { ObjectType, PropertyValidators } from "convex/values";
import { requireAllowedUser } from "./requireUser";

/**
 * Public + admin pair for a Convex function.
 *
 * - `.public` is what the UI calls (`api.dashboard.addTodo`). It requires an
 *   allowlisted Clerk identity.
 * - `.admin` is internal. The assistant runs it with the deploy key:
 *   `npx convex run dashboard:addTodoAdmin '{"text":"...","category":"Today"}'`
 *   Admin CLI calls have no Clerk identity, so they must use the admin twin.
 *
 * New mutations (todo edit/delete, project delete, job-lead archive, etc.):
 *
 *   const deleteProjectFns = exposeMutation({
 *     args: { id: v.id("projects") },
 *     handler: async (ctx, { id }) => {
 *       await ctx.db.delete(id);
 *     },
 *   });
 *   export const deleteProject = deleteProjectFns.public;
 *   export const deleteProjectAdmin = deleteProjectFns.admin;
 *
 * Do not export a raw `query` / `mutation` / `action` — those are callable by
 * anyone who knows the Convex URL. `"use node"` files should follow fuel.ts:
 * `requireAllowedUser` on the public action, `internalAction` for the admin twin.
 *
 * Actions that write data must call `internal.*.*Admin` (or an existing
 * internal mutation). `ctx.runMutation(api...)` does not carry the Clerk
 * identity, so the public wrapper would reject it.
 */

// `{}` validators have no keys and must look like Convex's EmptyObject so
// `useQuery(api.dashboard.getTodos)` can omit the args argument.
type ArgsOf<V extends PropertyValidators> = keyof ObjectType<V> extends never
  ? Record<string, never>
  : ObjectType<V>;

type QueryPair<V extends PropertyValidators, R> = {
  public: RegisteredQuery<"public", ArgsOf<V>, R>;
  admin: RegisteredQuery<"internal", ArgsOf<V>, R>;
};

type MutationPair<V extends PropertyValidators, R> = {
  public: RegisteredMutation<"public", ArgsOf<V>, R>;
  admin: RegisteredMutation<"internal", ArgsOf<V>, R>;
};

type ActionPair<V extends PropertyValidators, R> = {
  public: RegisteredAction<"public", ArgsOf<V>, R>;
  admin: RegisteredAction<"internal", ArgsOf<V>, R>;
};

export function exposeQuery<V extends PropertyValidators, R>(def: {
  args: V;
  handler: (ctx: QueryCtx, args: ObjectType<V>) => R;
}): QueryPair<V, R> {
  // `as any` only hides the generic-validator mismatch inside this helper.
  // The declared return type is what the UI and `internal.*Admin` references use.
  return {
    public: query({
      args: def.args,
      handler: async (ctx: any, args: any) => {
        await requireAllowedUser(ctx);
        return await def.handler(ctx, args);
      },
    } as any),
    admin: internalQuery({
      args: def.args,
      handler: async (ctx: any, args: any) => def.handler(ctx, args),
    } as any),
  } as QueryPair<V, R>;
}

export function exposeMutation<V extends PropertyValidators, R>(def: {
  args: V;
  handler: (ctx: MutationCtx, args: ObjectType<V>) => R;
}): MutationPair<V, R> {
  return {
    public: mutation({
      args: def.args,
      handler: async (ctx: any, args: any) => {
        await requireAllowedUser(ctx);
        return await def.handler(ctx, args);
      },
    } as any),
    admin: internalMutation({
      args: def.args,
      handler: async (ctx: any, args: any) => def.handler(ctx, args),
    } as any),
  } as MutationPair<V, R>;
}

export function exposeAction<V extends PropertyValidators, R>(def: {
  args: V;
  handler: (ctx: ActionCtx, args: ObjectType<V>) => R;
}): ActionPair<V, R> {
  return {
    public: action({
      args: def.args,
      handler: async (ctx: any, args: any) => {
        await requireAllowedUser(ctx);
        return await def.handler(ctx, args);
      },
    } as any),
    admin: internalAction({
      args: def.args,
      handler: async (ctx: any, args: any) => def.handler(ctx, args),
    } as any),
  } as ActionPair<V, R>;
}
