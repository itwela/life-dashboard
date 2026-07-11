/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiAssistant from "../aiAssistant.js";
import type * as checkIns from "../checkIns.js";
import type * as dashboard from "../dashboard.js";
import type * as financeDump from "../financeDump.js";
import type * as fuel from "../fuel.js";
import type * as http from "../http.js";
import type * as jobLeads from "../jobLeads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiAssistant: typeof aiAssistant;
  checkIns: typeof checkIns;
  dashboard: typeof dashboard;
  financeDump: typeof financeDump;
  fuel: typeof fuel;
  http: typeof http;
  jobLeads: typeof jobLeads;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
