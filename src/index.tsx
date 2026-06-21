import {
  Activity,
  createContext,
  useContext as useReactContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import {
  type Path,
  type PathWithData,
  type PathWithoutData,
  type DataArgs,
  type RouteMatch,
  type NavigationDirection,
  type NavigationStatus,
  type Navigate,
  type RouterContext,
  type Router as Handle,
  type RouteEntry,
  type RouteProps,
  type RouterDefinition,
  type RouterProps,
  type RoutesShape,
  type AppRoutes,
  type InferRoutes,
} from "./types";
import { resolveMatch, stripBase, makeUrls } from "./utils";

const Context = createContext<RouterContext>({
  status: "idle",
  destination: null,
  pathname: null,
  navigationId: 0,
  base: "",
  url: undefined,
  params: undefined,
});

const navigate: Navigate = {
  push: (href) => window.navigation.navigate(href, { history: "auto" }),
  replace: (href) => window.navigation.navigate(href, { history: "replace" }),
  back: () => window.navigation.back(),
  forward: () => window.navigation.forward(),
  reload: () => window.navigation.reload(),
};

/**
 * Internal hook — reads the router context and returns a typed handle.
 * Surfaced via `router.useContext()` (auto-typed against the definition's
 * urls) and `useRouter<U>()` / `shared.useContext<U>()` (generic for
 * cross-app code).
 */
function useRouterContext<U extends RoutesShape = RoutesShape>(): Handle<U> {
  const context = useReactContext(Context);

  return useMemo(
    () => ({
      status: context.status,
      url: (context.url ?? {}) as AppRoutes<U>,
      params: (context.params ?? {}) as Handle<U>["params"],
      navigate,
    }),
    [context.status, context.url, context.params],
  );
}

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

/**
 * Render-prop component scoped to a single href. Provides `active` and
 * `pending` state so only the element the user clicked shows a spinner
 * while the route's `data` function is running.
 *
 * Pass `replace` to navigate by replacing the current history entry instead
 * of pushing a new one — useful for canonicalisation and login redirects.
 *
 * @example
 * ```tsx
 * <Route href={router.url.user({ id: 1 })}>
 *   {route => (
 *     <a href={route.href}>
 *       User 1 {route.pending ? <Spinner /> : null}
 *     </a>
 *   )}
 * </Route>
 * ```
 */
export function Route({
  href,
  active,
  replace,
  children,
}: RouteProps): ReactElement {
  const context = useReactContext(Context);
  const [clickedId, setClickedId] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const navigationIdRef = useRef(context.navigationId);

  useEffect(() => {
    navigationIdRef.current = context.navigationId;
  }, [context.navigationId]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const handleClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      setClickedId(navigationIdRef.current + 1);

      if (replace) {
        event.preventDefault();
        window.navigation.navigate(href, { history: "replace" });
      }
    };

    element.addEventListener("click", handleClick, true);
    return () => element.removeEventListener("click", handleClick, true);
  }, [href, replace]);

  const handler = useCallback(
    (event?: React.MouseEvent) => {
      if (
        event &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      ) {
        return;
      }

      window.navigation.navigate(href, {
        history: replace ? "replace" : "auto",
      });
    },
    [href, replace],
  );

  const pending =
    clickedId === context.navigationId &&
    context.status === "navigating" &&
    context.destination === href;

  const strippedPathname =
    context.pathname != null ? stripBase(context.pathname, context.base) : null;

  const isActive = active
    ? strippedPathname != null && active(strippedPathname)
    : context.pathname === href;

  return (
    <span ref={wrapperRef} style={{ display: "contents" }}>
      {children({
        href,
        active: isActive,
        pending,
        handler,
        navigate,
      })}
    </span>
  );
}

/**
 * Top-level router component powered by the
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API | Navigation API}.
 *
 * Uses React `<Activity>` to preserve previously visited routes in the DOM.
 * The active route is `"visible"`, all others are `"hidden"` — preserving
 * component state, scroll position, and route data without re-fetching.
 *
 * Pass the {@link RouterDefinition} returned by {@link Routes} as the
 * `using` prop; the urls map, routes, and typed handle all flow through
 * automatically.
 *
 * @param mode `"deferred"` keeps the previous page while loading. `"immediate"` switches immediately with `status: "loading"`.
 *
 * @example
 * ```tsx
 * <Router using={routes} mode="deferred" base={import.meta.env.BASE_URL} />
 * ```
 */
/**
 * @internal
 * Standalone mount component — not exported from the package. Each
 * {@link Router} definition exposes a bound `router.Router` component
 * that pre-supplies `using`, so call sites only ever see the bound form.
 */
function MountRouter<U extends RoutesShape>({
  using,
  mode = "deferred",
  base = "",
  children,
}: RouterProps<U>): ReactElement {
  const routes = using._routes;
  const rawUrls = using._urls;

  const url = useMemo<AppRoutes<U>>(
    () => makeUrls(rawUrls, base) as AppRoutes<U>,
    [rawUrls, base],
  );

  const [initial] = useState(() =>
    resolveMatch(new URL(window.location.href), routes, base),
  );

  const [currentPathname, setCurrentPathname] = useState<string | null>(
    initial ? initial.url.pathname : null,
  );
  const [visited, setVisited] = useState<Map<string, RouteEntry>>(() => {
    const map = new Map<string, RouteEntry>();
    if (initial) {
      map.set(initial.url.pathname, {
        match: initial,
        data: undefined,
        error: undefined,
        status: initial.route.data ? "loading" : "ready",
      });
    }
    return map;
  });

  const [status, setStatus] = useState<NavigationStatus>(
    initial?.route.data ? "navigating" : "idle",
  );
  const [destination, setDestination] = useState<string | null>(
    initial?.route.data ? initial.url.pathname : null,
  );
  const [navigationId, setNavigationId] = useState(0);

  const abortController = useRef<AbortController | null>(null);
  const visitedSnapshot = useRef(visited);
  const activePathname = useRef(currentPathname);
  activePathname.current = currentPathname;
  visitedSnapshot.current = visited;

  const previousPathname = useRef<string | null>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());

  const activeEntry = currentPathname ? visited.get(currentPathname) : undefined;

  const params = useMemo<Record<string, Record<string, string> | undefined>>(() => {
    const out: Record<string, Record<string, string> | undefined> = {};
    for (const name of Object.keys(rawUrls)) {
      out[name] = undefined;
    }
    const activeRoute = activeEntry?.match.route;
    if (activeEntry && activeRoute?.name) {
      out[activeRoute.name] = activeEntry.match.params;
    }
    return out;
  }, [rawUrls, activeEntry]);

  const buildHandle = useCallback(
    (currentStatus: NavigationStatus): Handle => ({
      status: currentStatus,
      url: url as AppRoutes<RoutesShape>,
      params: params as AppRoutes<RoutesShape> extends never
        ? never
        : Handle["params"],
      navigate,
    }),
    [url, params],
  );

  const transitionTo = useCallback(
    (pathname: string, direction: NavigationDirection = "forward") => {
      if (activePathname.current) {
        scrollPositions.current.set(activePathname.current, window.scrollY);
      }

      document.documentElement.dataset.direction = direction;

      const commit = () => {
        flushSync(() => setCurrentPathname(pathname));
        window.scrollTo(
          0,
          direction === "back"
            ? (scrollPositions.current.get(pathname) ?? 0)
            : 0,
        );
      };

      if (document.startViewTransition && activePathname.current) {
        document.startViewTransition(commit);
      } else {
        commit();
      }
    },
    [],
  );

  const cancelNavigation = useCallback(() => {
    if (!abortController.current) return;

    abortController.current.abort();
    abortController.current = null;

    delete document.documentElement.dataset.direction;

    if (previousPathname.current) {
      setCurrentPathname(previousPathname.current);
      history.replaceState(null, "", previousPathname.current);
    }

    setStatus("idle");
    setDestination(null);
  }, []);

  const handleMatch = useCallback(
    async (
      nextMatch: RouteMatch,
      direction: NavigationDirection = "forward",
    ) => {
      if (abortController.current) {
        abortController.current.abort();
      }

      previousPathname.current = activePathname.current;
      const pathname = nextMatch.url.pathname;

      const existing = visitedSnapshot.current.get(pathname);
      const cache = existing?.status === "ready" ? existing.data : undefined;

      if (nextMatch.route.data) {
        const controller = new AbortController();
        abortController.current = controller;

        setStatus("navigating");
        setDestination(pathname);
        setNavigationId((id) => id + 1);

        if (mode === "immediate" || !activePathname.current) {
          // Capture the outgoing route's scroll position BEFORE swapping
          // currentPathname — otherwise `transitionTo` runs after the
          // pathname has already moved on and saves the new route's scroll
          // under the wrong key, breaking back-traversal restore.
          if (activePathname.current) {
            scrollPositions.current.set(
              activePathname.current,
              window.scrollY,
            );
          }
          setVisited((previous) => {
            const next = new Map(previous);
            next.set(pathname, {
              match: nextMatch,
              data: cache,
              error: undefined,
              status: "loading",
            });
            return next;
          });
          setCurrentPathname(pathname);
        }

        try {
          const result = await nextMatch.route.data({
            params: nextMatch.params,
            url: nextMatch.url,
            signal: controller.signal,
            cache,
          });

          if (controller.signal.aborted) return;

          setVisited((previous) => {
            const next = new Map(previous);
            next.set(pathname, {
              match: nextMatch,
              data: result,
              error: undefined,
              status: "ready",
            });
            return next;
          });
          transitionTo(pathname, direction);
        } catch (error) {
          if (controller.signal.aborted) return;
          setVisited((previous) => {
            const next = new Map(previous);
            next.set(pathname, {
              match: nextMatch,
              data: undefined,
              error: error instanceof Error ? error : new Error(String(error)),
              status: "error",
            });
            return next;
          });
          transitionTo(pathname, direction);
        } finally {
          if (!controller.signal.aborted) {
            abortController.current = null;
            setStatus("idle");
            setDestination(null);
          }
        }
      } else {
        setVisited((previous) => {
          const next = new Map(previous);
          next.set(pathname, {
            match: nextMatch,
            data: undefined,
            error: undefined,
            status: "ready",
          });
          return next;
        });
        transitionTo(pathname, direction);
        setStatus("idle");
        setDestination(null);
      }
    },
    [mode, transitionTo],
  );

  useEffect(() => {
    if (initial?.route.data) {
      handleMatch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelNavigation();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cancelNavigation]);

  useEffect(() => {
    const handler = (event: NavigateEvent) => {
      if (!event.canIntercept || event.hashChange) return;

      const u = new URL(event.destination.url);
      const nextMatch = resolveMatch(u, routes, base);

      if (nextMatch === null) return;

      const direction =
        event.navigationType === "traverse" &&
        event.destination.index < (window.navigation.currentEntry?.index ?? 0)
          ? ("back" as const)
          : ("forward" as const);

      event.intercept({
        scroll: "manual",
        async handler() {
          await handleMatch(nextMatch, direction);
        },
      });
    };

    window.navigation.addEventListener("navigate", handler);
    return () => window.navigation.removeEventListener("navigate", handler);
  }, [routes, base, handleMatch]);

  const contextValue = useMemo(
    () => ({
      status,
      destination,
      pathname: currentPathname,
      navigationId,
      base,
      url: url as AppRoutes<RoutesShape>,
      params: params as RouterContext["params"],
    }),
    [status, destination, currentPathname, navigationId, base, url, params],
  );

  const handle = useMemo(() => buildHandle(status), [buildHandle, status]);

  return (
    <Context.Provider value={contextValue}>
      {children}
      {Array.from(visited.entries()).map(([pathname, entry]) => {
        const render = entry.match.route.match;
        if (!render) return null;

        const args = entry.match.route.data
          ? {
              params: entry.match.params,
              router: handle,
              status: entry.status,
              data: entry.data,
              error: entry.error,
              url: entry.match.url,
            }
          : {
              params: entry.match.params,
              router: handle,
              url: entry.match.url,
            };

        return (
          <Activity
            key={pathname}
            mode={pathname === currentPathname ? "visible" : "hidden"}
          >
            {render(args)}
          </Activity>
        );
      })}
    </Context.Provider>
  );
}

/**
 * Define a strongly-typed route. Infers param types from the URL pattern
 * literal and the `data` function's return type for the `data` argument
 * in `match`. Wrap each route literal in `route({ ... })` so the data →
 * match.data flow stays typed.
 *
 * @example
 * ```tsx
 * route({
 *   name: "user",
 *   url: "/users/:id",
 *   async data({ params, signal }) {
 *     return await fetchUser(params.id, { signal });
 *   },
 *   match({ status, params, data }) {
 *     if (status === "loading") return <Skeleton />;
 *     if (status === "error") return <Error />;
 *     return <User id={params.id} name={data.name} />;
 *   },
 * })
 * ```
 */
export function route<
  const T extends string,
  D extends (args: DataArgs<T>) => unknown,
  const K extends string = never,
>(definition: PathWithData<T, D, K>): PathWithData<T, D, K>;
export function route<
  const T extends string,
  const K extends string = never,
>(definition: PathWithoutData<T, K>): PathWithoutData<T, K>;
export function route(
  definition: PathWithData | PathWithoutData,
): PathWithData | PathWithoutData {
  return definition;
}


/**
 * Creates a {@link RouterDefinition} — the per-app entrypoint that owns
 * the routes for an entire deployable.
 *
 * The urls type is inferred from each entry's `name`/`url` pair via a
 * `const` generic — no explicit `<Urls>` annotation needed. The returned
 * value carries:
 * - `routes.Router` — a pre-bound `<Router>` component (mount it directly,
 *   no `using` prop required)
 * - `routes.url.X(params)` — typed builders for every named route
 * - `routes.useContext()` — hook returning the typed navigation handle
 *
 * @example
 * ```tsx
 * // app/routes.ts
 * import { Routes, route } from "react-wayfinder";
 *
 * export const routes = Routes([
 *   route({ name: "home", url: "/", match: () => <Home /> }),
 *   route({
 *     name: "user",
 *     url: "/users/:id",
 *     async data({ params, signal }) {
 *       return fetchUser(params.id, { signal });
 *     },
 *     match({ status, params, data, error }) {
 *       if (status === "loading") return <Skeleton />;
 *       if (error) return <p>{error.message}</p>;
 *       if (data) return <User id={params.id} name={data.name} />;
 *       return null;
 *     },
 *   }),
 *   route({ name: "signOut", url: "/sign-out", redirect: "/" }),
 *   route({ url: "*", match: () => <NotFound /> }),
 * ]);
 *
 * // mount at root — no `using` prop, no children required
 * <routes.Router>{children}</routes.Router>;
 *
 * // anywhere inside — auto-typed
 * const router = routes.useContext();
 * <a href={router.url.user({ id: "42" })}>User 42</a>;
 * router.navigate.push(router.url.home());
 * ```
 */
/**
 * Build the urls map for a router from the `name`/`url` pair on each
 * named route. Anonymous routes (no `name` — wildcards, untracked
 * redirects) are skipped.
 */
function buildUrlsFromRoutes(routes: Path[]): RoutesShape {
  const out: Record<string, string> = {};
  for (const route of routes) {
    if (route.name) out[route.name] = route.url;
  }
  return out;
}

export function Router<const Entries extends readonly unknown[]>(
  entries: Entries,
): RouterDefinition<InferRoutes<Entries>> {
  type U = InferRoutes<Entries>;
  const routes = entries as unknown as Path[];
  const urls = buildUrlsFromRoutes(routes) as U;
  const url = makeUrls(urls) as AppRoutes<U>;

  const definition = {
    useContext: () => useRouterContext<U>(),
    url,
    Router: undefined as unknown as RouterDefinition<U>["Router"],
    _routes: routes,
    _urls: urls,
  };

  // Bind the standalone mount component to this definition so call sites
  // can mount via `<router.Router />` without threading `using` through.
  definition.Router = (props) => MountRouter({ using: definition, ...props });

  return definition;
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

export type {
  NavigationDirection,
  NavigationStatus,
  RouterContext,
  RouterMode,
  BoundRouterProps,
  Navigate,
  UrlBuilder,
  AppRoutes,
  AppParams,
  RoutesShape,
  RoutesOf,
  RouterDefinition,
} from "./types";

export type Router<U extends RoutesShape = RoutesShape> = Handle<U>;
