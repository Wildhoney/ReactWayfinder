# Data caching

The `data` function on every data-fetching route receives a `cache` accessor. It returns the previously-loaded payload (or `undefined` on first visit), so a route can decide whether to re-fetch or hand back the existing data.

The accessor is generic &mdash; supply the expected payload type at the call site to get a typed result without an `as` cast:

```tsx
async data({ params, signal, cache }) {
  const cached = cache<User>();
  if (cached) return cached;
  return fetchUser(params.id, { signal });
}
```

`cache<User>()` returns `User | undefined`, the type guard narrows to `User`, and the cached payload flows back into `match`'s `data` arg with no friction.

## Why an accessor, not a field

`cache: User | undefined` on the args would be cleaner to read, but TypeScript can't infer `User` from a field that's *consumed* before the data function returns &mdash; that's the F-bounded polymorphism problem (D depends on what the function returns, the function args depend on D). Moving the type parameter to the call site (`cache<D>()`) breaks the cycle: each invocation supplies its own `D`, no inference required.

## Patterns

### Always cache, always re-fetch in the background

For mostly-static data that should still revalidate:

```tsx
async data({ params, signal, cache }) {
  const cached = cache<User>();
  // Hand back the cached version immediately; kick off a re-fetch.
  if (cached) {
    void fetchUser(params.id, { signal }).then((fresh) => {
      // optimistic update — write back into your store, or trigger a navigate.reload()
    });
    return cached;
  }
  return fetchUser(params.id, { signal });
}
```

`router.navigate.reload()` triggers the data function again at the current URL &mdash; useful for a "Refresh" button or post-mutation reload.

### Cache with a TTL

Pair the accessor with a timestamp held inside the payload:

```tsx
type CachedUser = { user: User; fetchedAt: number };
const TTL_MS = 30_000;

async data({ params, signal, cache }) {
  const cached = cache<CachedUser>();
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached;
  }
  const user = await fetchUser(params.id, { signal });
  return { user, fetchedAt: Date.now() };
}
```

`match.ready` then reads `data.user` instead of `data` &mdash; trade-off for the freshness check is one extra indirection.

### Skip the cache for a specific navigation

Sometimes you want to force a fresh fetch (e.g. after a mutation). Bypass the cache by always fetching:

```tsx
async data({ params, signal }) {
  return fetchUser(params.id, { signal });
}
```

If a single route needs both modes, branch on a query string:

```tsx
async data({ params, url, signal, cache }) {
  if (url.searchParams.has("fresh")) {
    return fetchUser(params.id, { signal });
  }
  const cached = cache<User>();
  if (cached) return cached;
  return fetchUser(params.id, { signal });
}
```

## Caching is per-pathname, not per-route

Visited pathnames are kept in a `Map<string, RouteEntry>` inside `<router.Router>`. Two visits to `/users/1` share a cache entry; `/users/1` and `/users/2` don't &mdash; they're separate entries even though they're the same route definition. The `<Activity>` preserving each entry's React tree is what lets scroll position and component state survive a navigation away and back.

## Pair caching with view transitions for free continuity

If `cache` returns immediately, the route's `data` resolves synchronously on a re-visit. The router's deferred mode (default) skips the loading state when data is already available, so the view-transition CSS sees a single forward-traverse without an intermediate spinner frame &mdash; smoother than reaching for `mode="immediate"` and managing skeletons yourself.
