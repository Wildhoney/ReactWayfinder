import { describe, it, expect } from "vitest";
import {
  patternToRegex,
  matchPath,
  buildUrl,
  resolveMatch,
  stripBase,
  prefixBase,
} from "./utils";

describe("patternToRegex", () => {
  it("converts a static path to regex", () => {
    const regex = patternToRegex("/about");
    expect(regex.source).toBe("^\\/about$");
  });

  it("converts :param segments to named capture groups", () => {
    const regex = patternToRegex("/users/:id");
    expect(regex.source).toBe("^\\/users\\/(?<id>[^/]+)$");
  });

  it("handles multiple params", () => {
    const regex = patternToRegex("/posts/:slug/comments/:commentId");
    expect(regex.source).toBe(
      "^\\/posts\\/(?<slug>[^/]+)\\/comments\\/(?<commentId>[^/]+)$",
    );
  });
});

describe("matchPath", () => {
  it("matches a static path", () => {
    expect(matchPath("/about", "/about")).toEqual({});
  });

  it("returns null for non-matching static path", () => {
    expect(matchPath("/home", "/about")).toBeNull();
  });

  it("extracts params from :param segments", () => {
    expect(matchPath("/users/42", "/users/:id")).toEqual({ id: "42" });
  });

  it("extracts multiple params", () => {
    expect(
      matchPath(
        "/posts/hello-world/comments/5",
        "/posts/:slug/comments/:commentId",
      ),
    ).toEqual({
      slug: "hello-world",
      commentId: "5",
    });
  });

  it("decodes URI components", () => {
    expect(matchPath("/users/hello%20world", "/users/:name")).toEqual({
      name: "hello world",
    });
  });

  it("does not match partial paths", () => {
    expect(matchPath("/users/42/extra", "/users/:id")).toBeNull();
  });

  it("matches wildcard", () => {
    expect(matchPath("/anything/goes", "*")).toEqual({});
  });

  it("matches root path", () => {
    expect(matchPath("/", "/")).toEqual({});
  });
});

describe("buildUrl", () => {
  it("replaces :param with values", () => {
    expect(buildUrl("/users/:id", { id: 42 })).toBe("/users/42");
  });

  it("replaces multiple params", () => {
    expect(
      buildUrl("/posts/:slug/comments/:commentId", {
        slug: "hello",
        commentId: 5,
      }),
    ).toBe("/posts/hello/comments/5");
  });

  it("encodes param values", () => {
    expect(buildUrl("/users/:name", { name: "hello world" })).toBe(
      "/users/hello%20world",
    );
  });

  it("throws for missing params", () => {
    expect(() => buildUrl("/users/:id", {})).toThrow('Missing param "id"');
  });

  it("returns pattern as-is when no params", () => {
    expect(buildUrl("/about", {})).toBe("/about");
  });
});

describe("resolveMatch", () => {
  const routes = [
    { url: "/", match: () => null },
    { url: "/users/:id", match: () => null },
    { url: "*", match: () => null },
  ];

  it("matches the first matching route", () => {
    const url = new URL("http://localhost/");
    const result = resolveMatch(url, routes);
    expect(result?.route.url).toBe("/");
    expect(result?.params).toEqual({});
  });

  it("matches parameterised routes", () => {
    const url = new URL("http://localhost/users/42");
    const result = resolveMatch(url, routes);
    expect(result?.route.url).toBe("/users/:id");
    expect(result?.params).toEqual({ id: "42" });
  });

  it("falls through to wildcard", () => {
    const url = new URL("http://localhost/unknown/page");
    const result = resolveMatch(url, routes);
    expect(result?.route.url).toBe("*");
  });

  it("strips base before matching", () => {
    const url = new URL("http://localhost/app/users/42");
    const result = resolveMatch(url, routes, "/app");
    expect(result?.route.url).toBe("/users/:id");
    expect(result?.params).toEqual({ id: "42" });
  });

  it("matches root with base", () => {
    const url = new URL("http://localhost/app/");
    const result = resolveMatch(url, routes, "/app");
    expect(result?.route.url).toBe("/");
  });
});

describe("stripBase", () => {
  it("strips a base prefix from a pathname", () => {
    expect(stripBase("/app/about", "/app")).toBe("/about");
  });

  it("returns / when pathname equals the base", () => {
    expect(stripBase("/app", "/app")).toBe("/");
  });

  it("returns / when pathname equals the base with trailing slash", () => {
    expect(stripBase("/app/", "/app")).toBe("/");
  });

  it("handles base with trailing slash", () => {
    expect(stripBase("/app/about", "/app/")).toBe("/about");
  });

  it("returns pathname unchanged when base does not match", () => {
    expect(stripBase("/other/about", "/app")).toBe("/other/about");
  });
});

describe("prefixBase", () => {
  it("prepends base to a route path", () => {
    expect(prefixBase("/about", "/app")).toBe("/app/about");
  });

  it("prepends base to root path", () => {
    expect(prefixBase("/", "/app")).toBe("/app/");
  });

  it("handles base with trailing slash", () => {
    expect(prefixBase("/about", "/app/")).toBe("/app/about");
  });

  it("returns pathname unchanged when base is empty", () => {
    expect(prefixBase("/about", "")).toBe("/about");
  });
});
