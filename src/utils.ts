import type { Params, Path, RouteMatch } from "./types";

/**
 * Converts a URL pattern with `:param` segments into a regex with named capture groups.
 *
 * @example
 * ```ts
 * patternToRegex("/users/:id");
 * // /^\/users\/(?<id>[^/]+)$/
 * ```
 */
export function patternToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        const name = segment.slice(1);
        return `(?<${name}>[^/]+)`;
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return new RegExp(`^${regexStr}$`);
}

/**
 * Matches a pathname against a URL pattern. Returns extracted params or `null`.
 * The wildcard `"*"` matches any pathname and returns an empty params object.
 *
 * @example
 * ```ts
 * matchPath("/users/42", "/users/:id");
 * // { id: "42" }
 * ```
 */
export function matchPath(pathname: string, pattern: string): Params | null {
  if (pattern === "*") return {};

  const regex = patternToRegex(pattern);
  const match = pathname.match(regex);

  if (!match) return null;

  const params: Params = {};
  if (match.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      params[key] = decodeURIComponent(value);
    }
  }

  return params;
}

/**
 * Finds the first route that matches the given URL and returns the match
 * with extracted params. Returns `null` if no route matches.
 *
 * When {@link base} is provided the prefix is stripped from the pathname
 * before matching so route patterns stay root-relative (e.g. `"/"`).
 */
export function resolveMatch(
  url: URL,
  routes: Path[],
  base = "",
): RouteMatch | null {
  const pathname = base ? stripBase(url.pathname, base) : url.pathname;

  for (const route of routes) {
    const params = matchPath(pathname, route.url);
    if (params !== null) return { params, route, url };
  }

  return null;
}

/**
 * Strips a base path prefix from a pathname.
 * Returns `"/"` when the pathname equals the base exactly.
 */
export function stripBase(pathname: string, base: string): string {
  const normalised = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!pathname.startsWith(normalised)) return pathname;
  const stripped = pathname.slice(normalised.length);
  return stripped === "" ? "/" : stripped;
}

/**
 * Substitutes `:param` segments in a URL pattern with the provided values.
 * Throws if a required param is missing.
 *
 * @example
 * ```ts
 * buildUrl("/users/:id", { id: 42 });
 * // "/users/42"
 * ```
 */
export function buildUrl(
  pattern: string,
  params: Record<string, string | number>,
): string {
  return pattern.replace(/:([^/]+)/g, (_, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing param "${key}" for pattern "${pattern}"`);
    }
    return encodeURIComponent(String(value));
  });
}
