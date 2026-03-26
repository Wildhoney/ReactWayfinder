import {
  Activity,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import type {
  Path,
  PathWithLoader,
  PathWithoutLoader,
  LoaderArgs,
  RouterProps,
  RouteMatch,
  NavigationDirection,
  NavigationStatus,
  UrlFn,
  RouterContext,
  RouteEntry,
  RouteProps,
} from "./types";
import { resolveMatch, buildUrl } from "./utils";

const Context = createContext<RouterContext>({
  status: "idle",
  destination: null,
  url: null,
  navigationId: 0,
});

/**
 * Access the global navigation status. Useful for top-level progress bars
 * that should animate on any navigation, regardless of which element triggered it.
 *
 * @example
 * ```tsx
 * const { status } = useNavigation();
 * <ProgressBar isAnimating={status === "navigating"} />
 * ```
 */
export function useNavigation() {
  return useContext(Context);
}

/**
 * Strongly-typed URL builder. Returns a `string` — does not trigger navigation.
 * Use in `<a href>` or pass to `navigation.navigate()`.
 *
 * @example
 * ```tsx
 * <a href={url("/users/:id", { id: 42 })}>User 42</a>
 * ```
 */
export const url: UrlFn = ((
  pattern: string,
  params?: Record<string, string | number>,
) => {
  return params ? buildUrl(pattern, params) : pattern;
}) as UrlFn;

/**
 * Render-prop component scoped to a single href. Provides `active` and
 * `pending` state so only the element the user clicked shows a spinner.
 *
 * @example
 * ```tsx
 * <Route href={url("/users/:id", { id: 1 })}>
 *   {route => (
 *     <a href={route.href} onClick={route.handler}>
 *       User 1 {route.pending ? <Spinner /> : null}
 *     </a>
 *   )}
 * </Route>
 * ```
 */
export function Route({ href, active, children }: RouteProps) {
  const context = useContext(Context);
  const [clickedId, setClickedId] = useState<number | null>(null);

  const handler = useCallback(
    (event?: React.MouseEvent) => {
      if (
        event &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      ) {
        return;
      }

      setClickedId(context.navigationId + 1);

      const target = event?.currentTarget;
      const isAnchor = target instanceof HTMLAnchorElement;

      if (!isAnchor) {
        navigation.navigate(href);
      }
    },
    [context.navigationId, href],
  );

  const pending =
    clickedId === context.navigationId &&
    context.status === "navigating" &&
    context.destination === href;

  const isActive = active
    ? context.url != null && active(context.url)
    : context.url === href;

  return (
    <>
      {children({
        href,
        active: isActive,
        pending,
        handler,
      })}
    </>
  );
}

/**
 * Top-level router component powered by the
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API | Navigation API}.
 *
 * Uses React `<Activity>` to preserve previously visited routes in the DOM.
 * The active route is `"visible"`, all others are `"hidden"` — preserving
 * component state, scroll position, and loader data without re-fetching.
 *
 * @param mode `"deferred"` keeps the previous page while loading. `"immediate"` switches immediately with `status: "loading"`.
 *
 * @example
 * ```tsx
 * <Router routes={routes} mode="deferred" />
 * ```
 */
export function Router({ routes, mode = "deferred", children }: RouterProps) {
  const [initial] = useState(() =>
    resolveMatch(new URL(window.location.href), routes),
  );

  const [activePathname, setActivePathname] = useState<string | null>(
    initial ? initial.url.pathname : null,
  );
  const [visited, setVisited] = useState<Map<string, RouteEntry>>(() => {
    const map = new Map<string, RouteEntry>();
    if (initial) {
      map.set(initial.url.pathname, {
        match: initial,
        data: undefined,
        error: undefined,
        status: initial.route.loader ? "loading" : "ready",
      });
    }
    return map;
  });

  const [status, setStatus] = useState<NavigationStatus>(
    initial?.route.loader ? "navigating" : "idle",
  );
  const [destination, setDestination] = useState<string | null>(
    initial?.route.loader ? initial.url.pathname : null,
  );
  const [navigationId, setNavigationId] = useState(0);

  const abortController = useRef<AbortController | null>(null);
  const visitedSnapshot = useRef(visited);
  const activePathnameRef = useRef(activePathname);
  activePathnameRef.current = activePathname;
  visitedSnapshot.current = visited;

  const previousPathname = useRef<string | null>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());

  const transitionTo = useCallback(
    (pathname: string, direction: NavigationDirection = "forward") => {
      if (activePathnameRef.current) {
        scrollPositions.current.set(activePathnameRef.current, window.scrollY);
      }

      document.documentElement.dataset.direction = direction;

      const commit = () => {
        flushSync(() => setActivePathname(pathname));
        window.scrollTo(
          0,
          direction === "back"
            ? (scrollPositions.current.get(pathname) ?? 0)
            : 0,
        );
      };

      if (document.startViewTransition && activePathnameRef.current) {
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
      setActivePathname(previousPathname.current);
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

      previousPathname.current = activePathnameRef.current;
      const pathname = nextMatch.url.pathname;

      const existing = visitedSnapshot.current.get(pathname);
      const cache = existing?.status === "ready" ? existing.data : undefined;

      if (nextMatch.route.loader) {
        const controller = new AbortController();
        abortController.current = controller;

        setStatus("navigating");
        setDestination(pathname);
        setNavigationId((id) => id + 1);

        if (mode === "immediate" || !activePathnameRef.current) {
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
          setActivePathname(pathname);
        }

        try {
          const result = await nextMatch.route.loader({
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
    if (initial?.route.loader) handleMatch(initial);
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

      const url = new URL(event.destination.url);
      const nextMatch = resolveMatch(url, routes);

      if (nextMatch === null) return;

      const direction =
        event.navigationType === "traverse" &&
        event.destination.index < (navigation.currentEntry?.index ?? 0)
          ? ("back" as const)
          : ("forward" as const);

      event.intercept({
        scroll: "manual",
        async handler() {
          await handleMatch(nextMatch, direction);
        },
      });
    };

    navigation.addEventListener("navigate", handler);
    return () => navigation.removeEventListener("navigate", handler);
  }, [routes, handleMatch]);

  const context = useMemo(
    () => ({
      status,
      destination,
      url: activePathname,
      navigationId,
    }),
    [status, destination, activePathname, navigationId],
  );

  return (
    <Context.Provider value={context}>
      {children}
      {Array.from(visited.entries()).map(([pathname, entry]) => {
        const render = entry.match.route.component;
        const args = entry.match.route.loader
          ? {
              params: entry.match.params,
              status: entry.status,
              data: entry.data,
              error: entry.error,
              url: entry.match.url,
            }
          : { params: entry.match.params, url: entry.match.url };

        return (
          <Activity
            key={pathname}
            mode={pathname === activePathname ? "visible" : "hidden"}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(render as (args: any) => React.ReactNode)(args)}
          </Activity>
        );
      })}
    </Context.Provider>
  );
}

/**
 * Define a strongly-typed route. Infers param types from the URL pattern
 * and loader return type for the `data` argument in `component`.
 *
 * @example
 * ```tsx
 * route({
 *   url: "/users/:id",
 *   async loader({ params, signal }) {
 *     return await fetchUser(params.id, { signal });
 *   },
 *   component({ status, params, data }) {
 *     if (status === "loading") return <Skeleton />;
 *     if (status === "error") return <Error />;
 *     return <User id={params.id} name={data.name} />;
 *   },
 * })
 * ```
 */
export function route<
  T extends string,
  L extends (args: LoaderArgs<T>) => unknown,
>(definition: PathWithLoader<T, L>): Path;
export function route<T extends string>(definition: PathWithoutLoader<T>): Path;
export function route(definition: Path): Path {
  return definition;
}

export type {
  NavigationDirection,
  NavigationStatus,
  RouterContext,
  RouterMode,
  Routes,
} from "./types";
