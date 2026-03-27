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

/** Arguments passed to a route's {@link PathWithLoader.loader | loader} function. */
export type LoaderArgs<T extends string = string> = {
  /** Typed URL parameters extracted from the matched pattern. */
  params: ParamsFor<T>;
  /** The full URL that was navigated to. */
  url: URL;
  /** Aborted when the navigation is superseded or cancelled via Escape. */
  signal: AbortSignal;
  /** Previously cache data for this route, or `undefined` on first visit. */
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

type Loader<T extends string> = (args: LoaderArgs<T>) => unknown;

/**
 * A route definition with an async loader.
 * The loader's return type flows into the `component`'s `data` argument.
 *
 * @typeParam T - URL pattern literal (e.g. `"/users/:id"`)
 * @typeParam L - Loader function type, inferred automatically
 */
/** Discriminated union for component args when a loader is present. */
export type LoaderComponentArgs<T extends string, D> =
  | {
      params: ParamsFor<T>;
      status: "loading";
      data: undefined;
      error: undefined;
      url: URL;
    }
  | {
      params: ParamsFor<T>;
      status: "ready";
      data: D;
      error: undefined;
      url: URL;
    }
  | {
      params: ParamsFor<T>;
      status: "error";
      data: undefined;
      error: Error;
      url: URL;
    };

export type PathWithLoader<
  T extends string = string,
  L extends Loader<T> = Loader<T>,
> = {
  /** URL pattern with `:param` segments (e.g. `"/users/:id"`). */
  url: T;
  /** Async data fetcher — its return type is passed as `data` to `component`. */
  loader: L;
  /** Render function called with `"loading"`, `"ready"`, or `"error"` status. Narrow `data` via `status`. */
  component: (
    args: LoaderComponentArgs<T, Awaited<ReturnType<L>>>,
  ) => React.ReactNode;
};

/**
 * A route definition without a loader.
 *
 * @typeParam T - URL pattern literal (e.g. `"/about"`)
 */
export type PathWithoutLoader<T extends string = string> = {
  /** URL pattern with `:param` segments (e.g. `"/about"`). */
  url: T;
  /** Render function receiving typed `params` and `url`. */
  component: (args: { params: ParamsFor<T>; url: URL }) => React.ReactNode;
  loader?: undefined;
};

/** Component args for a route without a loader. */
type StaticComponentArgs = { params: Params; url: URL };

/** Component args for a route with a loader. */
type LoadedComponentArgs = LoaderComponentArgs<string, unknown>;

/** Type-erased route used internally by the {@link Router}. */
export type Path = {
  url: string;
  component: (
    args: StaticComponentArgs | LoadedComponentArgs,
  ) => React.ReactNode;
  loader?: (args: LoaderArgs) => unknown;
};

/** Array of route definitions — use with `satisfies Routes` for type-safe route configs. */
export type Routes = Path[];

/** Controls how the Router transitions between routes with loaders. */
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

/** Current navigation status — `"idle"` or `"navigating"` while a loader is running. */
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
  /** `true` if a loader is running AND this instance was clicked. */
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
  /** Render-prop receiving navigation state for this href. */
  children: RouteChildren;
};
