import { createContext, useContext as useReactContext, useMemo } from "react";
import type {
  AppRoutes,
  Navigate,
  Router as Handle,
  RouterContext,
  RoutesShape,
} from "../types";

export const Context = createContext<RouterContext>({
  status: "idle",
  destination: null,
  pathname: null,
  navigationId: 0,
  base: "",
  url: undefined,
  params: undefined,
});

export const navigate: Navigate = {
  push: (href) => window.navigation.navigate(href, { history: "auto" }),
  replace: (href) => window.navigation.navigate(href, { history: "replace" }),
  back: () => window.navigation.back(),
  forward: () => window.navigation.forward(),
  reload: () => window.navigation.reload(),
};

/**
 * Internal hook — reads the router context and returns a typed handle.
 * Surfaced via `router.useContext()` (auto-typed against the definition's
 * urls) and `useRouter<U>()` / `shared.useContext<U>()` (generic for
 * cross-app code).
 */
export function useRouterContext<
  U extends RoutesShape = RoutesShape,
>(): Handle<U> {
  const context = useReactContext(Context);

  return useMemo(
    () => ({
      status: context.status,
      url: (context.url ?? {}) as AppRoutes<U>,
      params: (context.params ?? {}) as Handle<U>["params"],
      navigate,
    }),
    [context.status, context.url, context.params],
  );
}
