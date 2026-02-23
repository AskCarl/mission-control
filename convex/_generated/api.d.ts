/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendar from "../calendar.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as memory from "../memory.js";
import type * as office from "../office.js";
import type * as research from "../research.js";
import type * as resolutionTracker from "../resolutionTracker.js";
import type * as seed from "../seed.js";
import type * as smoke from "../smoke.js";
import type * as team from "../team.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  calendar: typeof calendar;
  content: typeof content;
  crons: typeof crons;
  memory: typeof memory;
  office: typeof office;
  research: typeof research;
  resolutionTracker: typeof resolutionTracker;
  seed: typeof seed;
  smoke: typeof smoke;
  team: typeof team;
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
