import {
  useCallback,
  useContext as useReactContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Context, navigate } from "../context";
import { stripBase } from "../utils";
import type {
  DataArgs,
  PathWithData,
  PathWithoutData,
  RouteProps,
} from "../types";

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
export function route<const T extends string, const K extends string = never>(
  definition: PathWithoutData<T, K>,
): PathWithoutData<T, K>;
export function route(
  definition: PathWithData | PathWithoutData,
): PathWithData | PathWithoutData {
  return definition;
}
