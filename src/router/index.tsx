import {
  Activity,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import { Context, navigate, useRouterContext } from "../context";
import { makeUrls, resolveMatch } from "../utils";
import type {
  AppRoutes,
  InferRoutes,
  NavigationDirection,
  NavigationStatus,
  Path,
  RouteEntry,
  RouteMatch,
  RouterContext,
  RouterDefinition,
  RouterProps,
  Router as Handle,
  RoutesShape,
} from "../types";

/**
 * Top-level router component powered by the
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API | Navigation API}.
 *
 * Uses React `<Activity>` to preserve previously visited routes in the DOM.
 * The active route is `"visible"`, all others are `"hidden"` — preserving
 * component state, scroll position, and route data without re-fetching.
 *
 * Pass the {@link RouterDefinition} returned by {@link Router} as the
 * `using` prop; the urls map, routes, and typed handle all flow through
 * automatically.
 *
 * @param mode `"deferred"` keeps the previous page while loading. `"immediate"` switches immediately with `status: "loading"`.
 *
 * @example
 * ```tsx
 * <Router using={routes} mode="deferred" base={import.meta.env.BASE_URL} />
 * ```
 *
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

  const activeEntry = currentPathname
    ? visited.get(currentPathname)
    : undefined;

  const params = useMemo<
    Record<string, Record<string, string> | undefined>
  >(() => {
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
            scrollPositions.current.set(activePathname.current, window.scrollY);
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
            // Generic accessor — the data fn supplies the expected type at
            // the call site (`cache<User>()`), so no `as` cast is needed.
            cache: <D,>() => cache as D | undefined,
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
 * import { Router, route } from "react-wayfinder";
 *
 * export const routes = Router([
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

export type Router<U extends RoutesShape = RoutesShape> = Handle<U>;
