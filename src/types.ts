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

/** Router handle passed to `match` and `redirect` — the same shape as `useRouter()`. */
export type Router = {
  status: NavigationStatus;
  url: Url;
  navigate: Navigate;
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
  /** URL pattern with `:param` segments (e.g. `"/users/:id"`). */
  url: T;
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
  /** URL pattern with `:param` segments (e.g. `"/about"`). */
  url: T;
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
  url: T;
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

/** Props for the {@link Router} component. */
export type RouterProps = {
  /** Array of route definitions created with {@link route}. */
  routes: Path[];
  /** @default "deferred" */
  mode?: RouterMode;
  /** Base path prefix stripped before matching (e.g. `"/ReactWayfinder"`). @default "" */
  base?: string;
  /** Persistent elements rendered alongside matched routes (e.g. progress bars). */
  children?: React.ReactNode;
};

/**
 * Strongly-typed URL builder. Returns a `string` — does not trigger navigation.
 *
 * @example
 * ```tsx
 * const { navigate } = useRouter();
 * <a href={navigate("/users/:id", { id: 42 })}>User 42</a>
 * ```
 */
export type Url = <T extends string>(
  path: T,
  ...args: [ExtractParams<T>] extends [never]
    ? []
    : [Record<ExtractParams<T>, string | number>]
) => string;

/** Options accepted by {@link Navigate}. */
export type NavigateOptions = {
  /** Replace the current history entry instead of pushing a new one. @default false */
  replace?: boolean;
};

/** Programmatic navigation function — accepts a resolved href and an optional `replace` flag. */
export type Navigate = (href: string, options?: NavigateOptions) => void;

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
