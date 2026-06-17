/**
 * Extracts parameter names from a URL pattern string.
 *
 * @example
 * ```ts
 * type P = ExtractParams<"/users/:id/posts/:postId">;
 * // "id" | "postId"
 * ```
 */
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Maps a URL pattern to a typed params object.
 * When `T` is a generic `string`, falls back to `Record<string, string>`.
 *
 * @example
 * ```ts
 * type P = ParamsFor<"/users/:id">;
 * // { id: string }
 * ```
 */
export type ParamsFor<T extends string> = string extends T
  ? Params
  : [ExtractParams<T>] extends [never]
    ? Record<string, never>
    : Record<ExtractParams<T>, string>;

/** Untyped params record used at runtime. */
export type Params = Record<string, string>;

/**
 * Internal: shape of the raw `urls` map accepted by {@link App} — a record
 * of name → URL pattern string (e.g. `{ user: "/users/:id" }`). Not exported
 * from the public surface; users author this map inline in `App({ urls })`
 * and read the *built* form via `app.urls` / `router.urls`.
 */
export type UrlsShape = Record<string, string>;

/**
 * A callable URL builder. Given a `:param`-segment pattern `T`, the builder
 * is a function that takes the typed params and returns the substituted
 * pathname. Patterns with no params are zero-arg.
 *
 * Each builder carries its source `pattern` literal as a property, so route
 * definitions can reference `app.urls.user.pattern` without re-typing the
 * string.
 *
 * @example
 * ```ts
 * app.urls.home();               // "/"
 * app.urls.user({ id: 42 });     // "/users/42"
 * app.urls.user.pattern;         // "/users/:id"
 * ```
 */
export type UrlBuilder<T extends string> = ([ExtractParams<T>] extends [never]
  ? () => string
  : (params: Record<ExtractParams<T>, string | number>) => string) & {
  readonly pattern: T;
};

/**
 * Built form of an {@link App}'s urls — every entry in the source pattern
 * map transformed into a typed {@link UrlBuilder}.
 *
 * `app.urls` and `router.urls` both have this shape.
 */
export type AppUrls<U extends UrlsShape> = {
  readonly [K in keyof U]: UrlBuilder<U[K]>;
};

/** Arguments passed to a route's {@link PathWithData.data | data} function. */
export type DataArgs<T extends string = string> = {
  /** Typed URL parameters extracted from the matched pattern. */
  params: ParamsFor<T>;
  /** The full URL that was navigated to. */
  url: URL;
  /** Aborted when the navigation is superseded or cancelled via Escape. */
  signal: AbortSignal;
  /** Previously cached data for this route, or `undefined` on first visit. */
  cache: unknown;
};

/** Internal representation of a resolved route match. */
export type RouteMatch = {
  params: Params;
  route: Path;
  url: URL;
};

/** Entry in the visited routes map, used with `<Activity>` for state preservation. */
export type RouteEntry = {
  match: RouteMatch;
  data: unknown;
  error: Error | undefined;
  status: "loading" | "ready" | "error";
};

type DataFn<T extends string> = (args: DataArgs<T>) => unknown;

/**
 * Router handle passed to `match` and `redirect` — the same shape as `useRouter()`.
 *
 * @typeParam U - The url-pattern map passed to {@link App}. Pin via
 *   `app.useRouter()` (auto) or `shared.useRouter<typeof someApp>()`
 *   (generic at call site, for cross-app code).
 *
 * `urls` is typed as the built {@link AppUrls} form — each entry is a
 * callable builder. Read it directly when you only need a built path,
 * or wrap with `router.url(...)` to prefix the {@link RouterProps.base}.
 */
export type Router<U extends UrlsShape = UrlsShape> = {
  status: NavigationStatus;
  url: Url;
  navigate: Navigate;
  /** Callable URL builders for the enclosing {@link App}'s urls. */
  urls: AppUrls<U>;
};

/**
 * A route definition with an async `data` function.
 * The `data` function's return type flows into the `match` argument's `data` field.
 *
 * @typeParam T - URL pattern literal (e.g. `"/users/:id"`)
 * @typeParam D - `data` function type, inferred automatically
 */
/** Discriminated union for `match` args when a `data` function is present. */
export type DataComponentArgs<T extends string, D> =
  | {
      params: ParamsFor<T>;
      router: Router;
      status: "loading";
      data: undefined;
      error: undefined;
      url: URL;
    }
  | {
      params: ParamsFor<T>;
      router: Router;
      status: "ready";
      data: D;
      error: undefined;
      url: URL;
    }
  | {
      params: ParamsFor<T>;
      router: Router;
      status: "error";
      data: undefined;
      error: Error;
      url: URL;
    };

export type PathWithData<
  T extends string = string,
  D extends DataFn<T> = DataFn<T>,
> = {
  /** URL pattern (e.g. `"/users/:id"`) — pass a literal string or an `app.urls.X` builder. */
  url: T | UrlBuilder<T>;
  /** Async data fetcher — its return type is passed as `data` to `match`. */
  data: D;
  /** Render function called with `"loading"`, `"ready"`, or `"error"` status. Narrow `data` via `status`. */
  match: (
    args: DataComponentArgs<T, Awaited<ReturnType<D>>>,
  ) => React.ReactNode;
  redirect?: undefined;
};

/**
 * A route definition without a `data` function.
 *
 * @typeParam T - URL pattern literal (e.g. `"/about"`)
 */
export type PathWithoutData<T extends string = string> = {
  /** URL pattern (e.g. `"/about"`) — pass a literal string or an `app.urls.X` builder. */
  url: T | UrlBuilder<T>;
  /** Render function receiving typed `params`, `url`, and the `router` handle. */
  match: (args: {
    params: ParamsFor<T>;
    router: Router;
    url: URL;
  }) => React.ReactNode;
  data?: undefined;
  redirect?: undefined;
};

/** Arguments passed to a `redirect` callback. */
export type RedirectArgs<T extends string = string> = {
  params: ParamsFor<T>;
  router: Router;
  url: URL;
};

/**
 * A redirect-only route. Resolves to a target href and replaces the current
 * history entry — no component is rendered.
 *
 * @typeParam T - URL pattern literal
 */
export type PathWithRedirect<T extends string = string> = {
  /** URL pattern (e.g. `"/login"`) — pass a literal string or an `app.urls.X` builder. */
  url: T | UrlBuilder<T>;
  /** Target href (string) or callback returning the target href. Always replaces the current history entry. */
  redirect: string | ((args: RedirectArgs<T>) => string);
  match?: undefined;
  data?: undefined;
};

/** Component args for a route without a `data` function. */
type StaticComponentArgs = {
  params: Params;
  router: Router;
  url: URL;
};

/** Component args for a route with a `data` function. */
type LoadedComponentArgs = DataComponentArgs<string, unknown>;

/** Type-erased route used internally by the {@link Router}. */
export type Path = {
  url: string;
  match?: (args: StaticComponentArgs | LoadedComponentArgs) => React.ReactNode;
  data?: (args: DataArgs) => unknown;
  redirect?: string | ((args: RedirectArgs) => string);
};

/** Array of route definitions — use with `satisfies Routes` for type-safe route configs. */
export type Routes = Path[];

/** Controls how the Router transitions between routes that fetch data. */
export type RouterMode = "immediate" | "deferred";

/**
 * Props for the {@link Router} component.
 *
 * @typeParam U - The source url-pattern map. Normally you don't mount
 *   `<Router>` directly — use `<app.Router>` from {@link App} which threads
 *   `urls` through automatically.
 */
export type RouterProps<U extends UrlsShape = UrlsShape> = {
  /** Array of route definitions created with {@link route}. */
  routes: Path[];
  /** @default "deferred" */
  mode?: RouterMode;
  /** Base path prefix stripped before matching (e.g. `"/ReactWayfinder"`). @default "" */
  base?: string;
  /**
   * Pre-built URL builders for this app — supplied automatically by
   * `<app.Router>` from {@link App}. Made available to descendants so
   * `useRouter().urls.X(params)` resolves at any depth.
   */
  urls?: AppUrls<U>;
  /** Persistent elements rendered alongside matched routes (e.g. progress bars). */
  children?: React.ReactNode;
};

/**
 * Base-path prefixer. Accepts a built pathname and returns it with the
 * Router's {@link RouterProps.base} prepended. Does not trigger navigation.
 *
 * URL building has moved onto the callable {@link UrlBuilder | builders}
 * exposed via `app.urls` / `router.urls`, so this function is purely the
 * base-aware wrapper.
 *
 * @example
 * ```tsx
 * const router = useRouter();
 * <a href={router.url(router.urls.user({ id: 42 }))}>User 42</a>
 * ```
 */
export type Url = (href: string) => string;

/**
 * History action passed to {@link Navigate} — {@link Using.Push}
 * adds a new history entry (the default), {@link Using.Replace}
 * swaps the current one in place.
 */
export enum Using {
  Push,
  Replace,
}

/**
 * Programmatic navigation — same first argument as `<a href>`: a built
 * href string. The optional second argument selects the history action
 * (defaults to {@link Using.Push}); pass {@link Using.Replace} to swap
 * the current entry.
 *
 * Build the href via `app.urls.X(...)` before passing it in.
 *
 * @example
 * ```ts
 * router.navigate("/about");
 * router.navigate("/sign-in", Using.Replace);
 * router.navigate(app.urls.home());
 * router.navigate(app.urls.user({ id: 42 }));
 * router.navigate(app.urls.user({ id: 42 }), Using.Replace);
 * ```
 */
export type Navigate = (href: string, using?: Using) => void;

/** Current navigation status — `"idle"` or `"navigating"` while a `data` function is running. */
export type NavigationStatus = "idle" | "navigating";

/** Direction of a navigation — set as `data-direction` on `<html>` for view transition CSS. */
export type NavigationDirection = "forward" | "back";

/** Internal navigation context shared by the Router. */
export type RouterContext = {
  status: NavigationStatus;
  destination: string | null;
  pathname: string | null;
  navigationId: number;
  base: string;
  urls: AppUrls<UrlsShape> | undefined;
};

/** State provided to a {@link Route} child render function. */
export type RouteState = {
  /** The resolved href string. */
  href: string;
  /** `true` if this href matches the currently rendered route. */
  active: boolean;
  /** `true` if a `data` function is running AND this instance was clicked. */
  pending: boolean;
  /** Attach as `onClick` on non-anchor elements — navigates via the Navigation API and marks this instance as pending. */
  handler: (event?: React.MouseEvent) => void;
};

/** Render-prop function signature for {@link Route}. */
export type RouteChildren = (state: RouteState) => React.ReactNode;

/** Props for the {@link Route} component. */
export type RouteProps = {
  /** The resolved URL to navigate to. */
  href: string;
  /** Custom predicate for when this route should be marked active. Falls back to exact href match. */
  active?: (url: string) => boolean;
  /** Replace the current history entry instead of pushing a new one when this route is activated. @default false */
  replace?: boolean;
  /** Render-prop receiving navigation state for this href. */
  children: RouteChildren;
};
