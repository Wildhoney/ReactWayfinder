# Route params

`router.params` mirrors `router.url`: every named route exposes its typed params, or `undefined` if that route isn't the currently active match. This lets *any* component in the tree &mdash; not just the one rendered by `match` &mdash; read the active route's params without prop-drilling.

```tsx
function UserBreadcrumb() {
  const context = router.useContext();
  const params = context.params.user;   // { id: string } | undefined

  if (!params) return null;
  return <span>User #{params.id}</span>;
}
```

The `if (!params) return null` is meaningful &mdash; the component might render under a *different* active route (e.g. the breadcrumb lives in a layout above the route outlet). When the route isn't active, `params` is `undefined`, and you skip the render.

## Typing comes from the URL pattern

`router.params.user`'s type is `ParamsFor<"/users/:id"> | undefined`, computed from the route's `url` literal. Multi-segment patterns infer each `:param`:

```tsx
const router = Router([
  route({
    name: "post",
    url: "/posts/:slug/comments/:commentId",
    match: () => <Post />,
  }),
]);

function PostBreadcrumb() {
  const context = router.useContext();
  const params = context.params.post; // { slug: string; commentId: string } | undefined
  if (!params) return null;
  return <span>{params.slug} / {params.commentId}</span>;
}
```

## Cross-app shared components

The same distribution-over-union rules apply as for `url`. `shared.useContext<U1 | U2>()` returns `params` as a distributed union; narrow with an `is*App` guard and `params.X` becomes typed against that app's routes:

```tsx
import { shared, type Router } from "react-wayfinder";
import * as web from "@app/web/router";
import * as mobile from "@app/mobile/router";

type AnyRoutes = typeof web.Routes | typeof mobile.Routes;

function isWebApp(context: Router<AnyRoutes>): context is Router<typeof web.Routes> {
  return "dashboard" in context.url;
}

function DashboardCrumb() {
  const context = shared.useContext<AnyRoutes>();
  if (!isWebApp(context)) return null;

  const params = context.params.dashboard; // typed against web's Routes
  // …
}
```

## Why "active route's params" lives on the handle

Wayfinder routes only render the route that matches the current URL (via React `<Activity>` for state preservation). The router *knows* which route is active and what its extracted params are &mdash; it just hasn't traditionally exposed that fact except through the `match({ params })` arg.

Putting `params` on the handle is just plumbing the info that already exists into the same shape as `url`: a record keyed by route name. The runtime walks `Object.keys(urls)` once at render time and sets the active route's entry to its match.params, every other entry to `undefined`. No additional state.

## When to reach for it

- **Breadcrumbs, layouts, page titles** &mdash; anything above the route outlet that needs to know "what's the current entity?"
- **Cross-cutting analytics** &mdash; one effect that reports the active route's params, mounted high in the tree.
- **Conditional UI** &mdash; show a sidebar variant when on `/users/:id`, hide it elsewhere.

If you're inside the route's own `match` callback, prefer the `params` arg you already get there &mdash; it's narrower (single route's type, not a union with `undefined`).
