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
 * Shape of the `Urls` type passed to `Router<Urls>(routes)` — a record of
 * name → URL pattern string (e.g. `{ user: "/users/:id" }`). Declared as a
 * type only; the same names appear on each route's `name` field at the
 * call site so the runtime can build `router.url[name](params)` builders
 * without a separate runtime urls map.
 */
export type RoutesShape = Record<string, string>;

/**
 * A callable URL builder. Given a `:param`-segment pattern `T`, the builder
 * is a function that takes the typed params and returns the substituted
 * pathname (with the Router's `base` prefixed). Patterns with no params are
 * zero-arg.
 *
 * Each builder carries its source `pattern` literal as a property so
 * shared/cross-app components can discriminate between same-key/different-
 * params variants via `if (router.url.user.pattern === "/users/:id")`.
 *
 * @example
 * ```ts
 * router.url.home();               // "/"
 * router.url.user({ id: 42 });     // "/users/42"
 * router.url.user.pattern;         // "/users/:id"
 * ```
 */
export type UrlBuilder<T extends string> = ([ExtractParams<T>] extends [never]
  ? () => string
  : (params: Record<ExtractParams<T>, string | number>) => string) & {
  readonly pattern: T;
};

/**
 * Built form of a {@link RoutesShape} — every entry transformed into a typed
 * {@link UrlBuilder}. Surfaced via `router.url` on the handle returned by
 * `router.useContext()` and `shared.useContext<U>()`.
 *
 * Mapped types distribute over unions, so `AppRoutes<U1 | U2>` becomes
 * `AppRoutes<U1> | AppRoutes<U2>`. That's what makes `'key' in router.url`
 * narrowing work for `shared.useContext<U1 | U2>()`.
 */
export type AppRoutes<U extends RoutesShape> = U extends RoutesShape
  ? {
      readonly [K in keyof U]: UrlBuilder<U[K]>;
    }
  : never;

/**
 * Active-route params surfaced on the handle via `router.params.X`. Mirrors
 * {@link AppRoutes} but each entry is the typed params object for that
 * route's URL pattern, or `undefined` when that route isn't the currently
 * active match.
 *
 * @example
 * ```ts
 * const context = router.useContext();
 * const params = context.params.user;   // { id: string } | undefined
 * if (params) return <h1>User #{params.id}</h1>;
 * ```
 */
export type AppParams<U extends RoutesShape> = U extends RoutesShape
  ? {
      readonly [K in keyof U]: ParamsFor<U[K]> | undefined;
    }
  : never;

/**
 * Arguments passed to a route's `data` function.
 *
 * @typeParam T - URL pattern literal — drives the typed `params` field.
 */
export type DataArgs<T extends string = string> = {
  /** Typed URL parameters extracted from the matched pattern. */
  params: ParamsFor<T>;
  /** The full URL that was navigated to. */
  url: URL;
  /** Aborted when the navigation is superseded or cancelled via Escape. */
  signal: AbortSignal;
  /**
   * Generic accessor for the previously-fetched payload (or `undefined`
   * on first visit). Pass the expected payload type as the generic so
   * the result lands typed at the call site &mdash; no `as` cast needed.
   *
   * @example
   * ```ts
   * data: async ({ params, signal, cache }) => {
   *   const cached = cache<User>();   // User | undefined
   *   if (cached) return cached;
   *   return fetchUser(params.id, { signal });
   * }
   * ```
   */
  cache: <D = unknown>() => D | undefined;
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

/**
 * Router handle passed to `match` and `redirect` — the same shape returned
 * by `router.useContext()` and `shared.useContext<U>()`.
 *
 * @typeParam U - The url-pattern map declared as the `Urls` type passed to
 *   `Router<Urls>(...)`. Pin via `router.useContext()` (auto) or
 *   `shared.useContext<typeof urls>()` / `useRouter<typeof urls>()`
 *   (generic at call site, for cross-app code).
 *
 * `url` is typed as the built {@link AppRoutes} form — each entry is a
 * callable builder that returns the base-prefixed pathname. Call
 * `router.url.X(params)` directly when constructing hrefs or passing into
 * `router.navigate.push(...)`.
 */
export type Router<U extends RoutesShape = RoutesShape> = {
  status: NavigationStatus;
  url: AppRoutes<U>;
  params: AppParams<U>;
  navigate: Navigate;
};

/** Component args for a route without a `data` function. */
export type StaticMatchArgs<T extends string> = {
  params: ParamsFor<T>;
  router: Router;
  url: URL;
};

/**
 * Discriminated component args for a route *with* a `data` function.
 * Destructure `{ status, params, data, error }` at the top and branch
 * on `status` — TypeScript narrows the sibling `data` / `error` fields
 * to match (TS 5.4+ correlated-narrowing).
 *
 * - `"loading"` — the fetch is in flight; `data` and `error` are both
 *   `undefined`.
 * - `"ready"` — the fetch resolved; `data` is the typed payload, `error`
 *   is `undefined`.
 * - `"error"` — the fetch rejected; `error` is the `Error`, `data` is
 *   `undefined`.
 */
export type DataMatchArgs<T extends string, D = unknown> =
  | {
      params: ParamsFor<T>;
      router: Router;
      url: URL;
      status: "loading";
      data?: undefined;
      error?: undefined;
    }
  | {
      params: ParamsFor<T>;
      router: Router;
      url: URL;
      status: "ready";
      data: D;
      error?: undefined;
    }
  | {
      params: ParamsFor<T>;
      router: Router;
      url: URL;
      status: "error";
      data?: undefined;
      error: Error;
    };

/** Function type for a route's `data` fetcher. */
type DataFn<T extends string> = (args: DataArgs<T>) => unknown;

/**
 * A route definition with an async `data` function. The `data` function's
 * return type flows into the `match` argument's `data` field via
 * `Awaited<ReturnType<D>>`.
 *
 * @typeParam T - URL pattern literal (e.g. `"/users/:id"`)
 * @typeParam D - data function type — inferred automatically by {@link route}
 */
export type PathWithData<
  T extends string = string,
  D extends DataFn<T> = DataFn<T>,
  K extends string = string,
> = {
  /** URL pattern literal — must match the key in `Urls` this route binds to via `name`. */
  url: T;
  /** URL-name — a key of the `Urls` shape `Routes()` infers from the entries array. */
  name?: K;
  /** Async data fetcher — its return type flows into `args.data` inside `match`'s `"ready"` case. */
  data: D;
  /**
   * Single render function that receives a discriminated union keyed on
   * `status`. Destructure `{ status, params, ... }` at the top, then
   * switch on `status` and read `args.data` / `args.error` inside the
   * matching case so TS keeps the discriminant correlation.
   */
  match?: (args: DataMatchArgs<T, Awaited<ReturnType<D>>>) => React.ReactNode;
};

/**
 * A route definition without a `data` function.
 *
 * @typeParam T - URL pattern literal (e.g. `"/about"`)
 */
export type PathWithoutData<
  T extends string = string,
  K extends string = string,
> = {
  /** URL pattern literal — the same string declared on the corresponding `Urls[name]`. */
  url: T;
  /** URL-name. Must be a key of the `Urls` type passed to `Router<Urls>(...)`. */
  name?: K;
  /** Render function receiving typed `params`, `url`, and the `router` handle. */
  match: (args: StaticMatchArgs<T>) => React.ReactNode;
  data?: undefined;
};

/** Type-erased route used internally by the router. */
export type Path = {
  url: string;
  name?: string;
  match?: (
    args: StaticMatchArgs<string> | DataMatchArgs<string>,
  ) => React.ReactNode;
  data?: (args: DataArgs) => unknown;
};

/** Controls how the Router transitions between routes that fetch data. */
export type RouterMode = "immediate" | "deferred";

/** Props for the per-definition `<routes.Router>` component. */
export type BoundRouterProps = {
  /** @default "deferred" */
  mode?: RouterMode;
  /** Base path prefix stripped before matching (e.g. `"/ReactWayfinder"`). @default "" */
  base?: string;
  /** Persistent elements rendered alongside matched routes (e.g. progress bars). */
  children?: React.ReactNode;
};

/**
 * Definition returned by {@link Routes}. Mount via `<routes.Router>` (the
 * component is pre-bound to this definition) and call `.useContext()`
 * from inside the tree to read the navigation handle.
 *
 * @typeParam U - URL-pattern shape carried through to typed `router.url.X`
 *   builders on the handle.
 */
export type RouterDefinition<U extends RoutesShape> = {
  /** Hook: returns the router handle scoped to this definition's urls. */
  useContext: () => Router<U>;
  /** Built url-builders — same object surfaced on the handle. */
  url: AppRoutes<U>;
  /** Pre-bound `<Router>` component — no `using` prop needed. */
  Router: (props: BoundRouterProps) => React.ReactElement;
  /** @internal — consumed by the bound `<Router>` component. */
  readonly _routes: Path[];
  /** @internal — the raw urls map, used to re-build builders with a base prefix. */
  readonly _urls: U;
};

/**
 * Type-level extractor — given a {@link RouterDefinition}, returns the
 * URL-pattern shape declared as its `Urls` generic. Use it to re-export
 * an `Urls` type from each app for `shared.useContext<U>()` consumers
 * without restating the urls map.
 *
 * @example
 * ```ts
 * import { routes } from "./routes";
 * export type Urls = RoutesOf<typeof routes>;
 * ```
 */
export type RoutesOf<R> = R extends RouterDefinition<infer U> ? U : never;

/**
 * @internal
 * Infers the urls-shape from a tuple of {@link route} entries. Named
 * routes (those with a `name` field) contribute one entry each; anonymous
 * routes (wildcards, untracked redirects) are skipped.
 */
type NameOf<E> = E extends { name?: infer K }
  ? K extends string
    ? K
    : never
  : never;

export type InferRoutes<Entries extends readonly unknown[]> = {
  -readonly [E in Entries[number] as NameOf<E>]: E extends {
    url: infer T extends string;
  }
    ? T
    : never;
};

/**
 * Props for the {@link Router} component.
 *
 * @typeParam U - URL-pattern shape carried in from the `using` definition.
 */
export type RouterProps<U extends RoutesShape = RoutesShape> = {
  /** The {@link RouterDefinition} returned by {@link Routes}. */
  using: RouterDefinition<U>;
  /** @default "deferred" */
  mode?: RouterMode;
  /** Base path prefix stripped before matching (e.g. `"/ReactWayfinder"`). @default "" */
  base?: string;
  /** Persistent elements rendered alongside matched routes (e.g. progress bars). */
  children?: React.ReactNode;
};

/**
 * Programmatic-navigation helpers on the router handle. Methods take a
 * pre-built href (use the `router.url.X(...)` builders) and dispatch
 * through the Navigation API.
 *
 * @example
 * ```ts
 * router.navigate.push(router.url.user({ id: 42 }));
 * router.navigate.replace(router.url.signIn());
 * router.navigate.back();
 * router.navigate.forward();
 * ```
 */
export type Navigate = {
  /** Push a new history entry. */
  push: (href: string) => void;
  /** Replace the current history entry in place. */
  replace: (href: string) => void;
  /** Traverse one entry back, equivalent to the browser back button. */
  back: () => void;
  /** Traverse one entry forward. */
  forward: () => void;
  /**
   * Re-evaluate the current route's `data` function. Triggers a
   * Navigation-API reload, which dispatches a `navigate` event at the
   * current URL and re-runs the matched route's data fetcher.
   */
  reload: () => void;
};

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
  url: AppRoutes<RoutesShape> | undefined;
  params: AppParams<RoutesShape> | undefined;
};

/** State provided to a {@link Route} child render function. */
export type RouteState = {
  /** The resolved href string. */
  href: string;
  /** `true` if this href matches the currently rendered route. */
  active: boolean;
  /** `true` if a `data` function is running AND this instance was clicked. */
  pending: boolean;
  /**
   * Attach as `onClick` on non-anchor elements — navigates via the
   * Navigation API and marks this instance as pending. Uses `replace` if
   * the parent `<Route>` has `replace` set, otherwise pushes.
   */
  handler: (event?: React.MouseEvent) => void;
  /**
   * Same `push`/`replace`/`back`/`forward` methods as
   * `router.navigate`, exposed on the render-prop state for when you
   * want to override the default action without lifting the navigate
   * handle from `useContext()`.
   */
  navigate: Navigate;
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
