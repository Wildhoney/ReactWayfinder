import { useEffect } from "react";

/**
 * Render-helper for in-`match` redirects — return it from a route's
 * `match` callback to redirect away from the matched URL. The redirect
 * runs once on mount via `useEffect` and uses `history: "replace"` so
 * the back button skips the redirect source.
 *
 * @example
 * ```tsx
 * route({
 *   url: "/contact",
 *   match: () => <Redirect href="/contact/email" />,
 * })
 * ```
 */
export function Redirect({ href }: { href: string }): null {
  useEffect(() => {
    window.navigation.navigate(href, { history: "replace" });
  }, [href]);
  return null;
}
