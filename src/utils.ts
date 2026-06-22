import type {
  AppRoutes,
  Params,
  Path,
  RouteMatch,
  UrlBuilder,
  RoutesShape,
} from "./types";

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
 * Prepends a base path to a route-relative pathname.
 * Returns the pathname unchanged when no base is set.
 */
export function prefixBase(pathname: string, base: string): string {
  if (!base) return pathname;
  const normalised = base.endsWith("/") ? base.slice(0, -1) : base;
  return pathname === "/" ? normalised + "/" : normalised + pathname;
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

/**
 * Wraps a single URL pattern as a callable {@link UrlBuilder} with the
 * source `pattern` literal attached as a property. When `base` is
 * provided, the builder returns the base-prefixed pathname so call sites
 * can pass the result straight into `<a href>` or `router.navigate()`.
 */
function makeBuilder<T extends string>(
  pattern: T,
  base: string,
): UrlBuilder<T> {
  const builder = (params?: Record<string, string | number>) => {
    const path = params ? buildUrl(pattern, params) : pattern;
    return base ? prefixBase(path, base) : path;
  };
  return Object.assign(builder, { pattern }) as UrlBuilder<T>;
}

/**
 * Transforms a raw url-pattern map (the value passed to `Router({ urls })`)
 * into the built {@link AppRoutes} form — every entry becomes a callable
 * builder. Each builder retains its source pattern via `.pattern`.
 *
 * Pass `base` to bake the Router's base prefix into every builder result
 * so call sites get a ready-to-use href in one call.
 *
 * @example
 * ```ts
 * const url = makeUrls({ home: "/", user: "/users/:id" });
 * url.home();             // "/"
 * url.user({ id: 42 });   // "/users/42"
 * url.user.pattern;       // "/users/:id"
 *
 * const based = makeUrls({ home: "/" }, "/app");
 * based.home();           // "/app/"
 * ```
 */
export function makeUrls<U extends RoutesShape>(
  urls: U,
  base = "",
): AppRoutes<U> {
  const result: Record<string, UrlBuilder<string>> = {};
  for (const key in urls) {
    result[key] = makeBuilder(urls[key], base) as UrlBuilder<string>;
  }
  return result as AppRoutes<U>;
}
