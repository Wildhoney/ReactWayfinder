import { useRouterContext } from "../context";
import type { Router as Handle, RoutesShape } from "../types";

/**
 * Standalone counterpart to `router.useContext()` and `shared.useContext()`.
 * Returns the active router's handle, optionally typed against a urls
 * shape passed as a generic.
 *
 * Prefer `router.useContext()` for single-app code (auto-typed from the
 * `Router({ urls })` it was returned from). Reach for `useRouter<U>()`
 * when you want a typed handle without importing a specific `router`
 * &mdash; e.g. inside a UI library that ships components for any host.
 *
 * @example
 * ```tsx
 * import { useRouter } from "react-wayfinder";
 * import type { Urls } from "@app/router";
 *
 * function Header() {
 *   const router = useRouter<Urls>();
 *   return <a href={router.url.home()}>Home</a>;
 * }
 * ```
 */
export function useRouter<U extends RoutesShape = RoutesShape>(): Handle<U> {
  return useRouterContext<U>();
}

/**
 * `shared` namespace — standalone counterparts to the `router.X` hooks
 * returned by {@link Router}. `shared.useContext<U>()` takes one or more
 * url-pattern types as a mandatory generic so reusable components can run
 * under multiple Routers without binding to a single `router` import.
 *
 * Reach for `shared.X` only when a component must support more than one
 * Router. Single-app code should stick with `router.X` — the urls are
 * captured from `router` automatically and the call site is one generic
 * shorter.
 *
 * When the generic is a union, mapped types distribute: `router.url` becomes
 * `AppRoutes<U1> | AppRoutes<U2>`. TypeScript's built-in narrowing then forces
 * the call site to discriminate:
 *
 * - `if ("dashboard" in router.url)` narrows when a key exists in only one app.
 * - `if (router.url.user.pattern === "/users/:id")` narrows when the same
 *   key has different params across apps.
 *
 * | Bound to a Router          | Standalone (`shared.X`)               |
 * | -------------------------- | ------------------------------------- |
 * | `router.useContext()`      | `shared.useContext<typeof urls>()`    |
 *
 * @example
 * ```tsx
 * // shared/types.ts
 * import type { urls as webUrls } from "@app/web";
 * import type { urls as mobileUrls } from "@app/mobile";
 *
 * export type Urls = typeof webUrls | typeof mobileUrls;
 *
 * // shared/components/sign-out.tsx — works under any host
 * import { shared } from "react-wayfinder";
 * import type { Urls } from "@shared/types";
 *
 * export function SignOut() {
 *   const router = shared.useContext<Urls>();
 *   // `signOut` exists on every arm of the union — direct access type-checks
 *   return <a href={router.url.signOut()}>Sign out</a>;
 * }
 * ```
 */
export const shared = {
  useContext<U extends RoutesShape>(): Handle<U> {
    return useRouterContext<U>();
  },
};
