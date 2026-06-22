# Redirects

There's no dedicated `redirect:` field on routes &mdash; every redirect goes through `match()` returning `<Redirect href="...">`. One less API surface, and the redirect target stays inside the type system because `<Redirect>` is just an href consumer.

## Catch-all 404 → home

The wildcard `"*"` route matches anything that didn't match earlier. Return `<Redirect>` to bounce unknown URLs to a canonical destination:

```tsx
import { Router, Redirect, route } from "react-wayfinder";

export const router = Router([
  route({ name: "home", url: "/", match: () => <Home /> }),
  // …other routes…
  route({
    url: "*",
    match: () => <Redirect href={router.url.home()} />,
  }),
]);
```

The redirect target uses `router.url.home()` &mdash; type-safe, base-prefixed, no hard-coded path.

## Canonicalisation

Send `/contact` → `/contact/email` so the visible URL always carries a `:method`:

```tsx
route({
  url: "/contact",
  match: () => <Redirect href={router.url.contact({ method: "email" })} />,
}),
```

`<Redirect>` always uses `history: "replace"`, so the browser back button skips past `/contact` &mdash; the user goes straight from the previous page to `/contact/email`.

## Conditional redirects

Need the redirect to depend on params, the active user, or feature flags? `match()` is a regular function &mdash; conditional any way you like:

```tsx
route({
  name: "user",
  url: "/users/:id",
  match({ params }) {
    if (params.id === "me") {
      return <Redirect href={router.url.user({ id: currentUserId() })} />;
    }
    return <UserPage id={params.id} />;
  },
}),
```

For a redirect that depends on async state, return `<Redirect>` from inside the `status === "ready"` branch of a data route:

```tsx
route({
  name: "settings",
  url: "/settings",
  async data({ signal }) {
    return fetchSession({ signal });
  },
  match({ status, data, error }) {
    if (status === "loading") return <Skeleton />;
    if (status === "error") return <p>{error.message}</p>;
    if (data && !data.user) {
      return <Redirect href={router.url.signIn()} />;
    }
    return <SettingsPage user={data!.user} />;
  },
}),
```

## How `<Redirect>` avoids re-fire loops

`<Redirect>` schedules `window.navigation.navigate(href, { history: "replace" })` inside a `useEffect`. Because the effect's dependency array is `[href]`, it fires once per render of the redirect target &mdash; not on every re-render of the surrounding `<Activity>`. If you navigate back to the same redirect-originating URL, the component mounts again and fires once more, which is what you want.

If you need the redirect to happen synchronously (e.g. SEO crawlers), pre-resolve the redirect at the server &mdash; the router itself doesn't try to short-circuit, it just plays the redirect through the Navigation API like any other navigation.

## Why not a `redirect:` field?

Earlier versions had `redirect: "/foo"` or `redirect: ({ router }) => router.url.foo()` as a top-level route property. It was retired because:

- **No way to type the callback's `router` arg cleanly** &mdash; the urls type isn't known until the surrounding `Router([...])` call, so the callback ended up either untyped or required an `as unknown as { foo: ... }` cast at the call site.
- **Two ways to do the same thing** &mdash; a route could either render via `match` OR redirect via `redirect`. Collapsing into one path (everything renders, redirects render `<Redirect>`) shrinks the API surface and keeps the route literal's shape consistent.
- **The runtime branch is gone** &mdash; no `performRedirect` special-case in the `<router.Router>` render loop. Every route runs through `match()`, and `<Redirect>` is just a component that calls `window.navigation.navigate`.
