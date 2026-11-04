import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

type Rewrite = { source: string; destination: string };

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { rewrites: Rewrite[] };
const rewrites = config.rewrites;

/**
 * Mirrors the syntax Vercel's matcher accepts for `rewrites.source`:
 * literal text, named params (`:id`), zero-or-more params (`:all*`) and
 * plain capture groups (`(.*)`). Lookahead groups like `((?!assets).*)`
 * are NOT accepted by that matcher, so the translator refuses them.
 */
function toRegExp(source: string): RegExp {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === ":") {
      const param = /^:([A-Za-z0-9_]+)([+*?]?)/.exec(source.slice(i));
      if (!param) throw new Error(`Invalid param in source: ${source}`);
      out += param[2] === "*" || param[2] === "+" ? "(.*)" : "([^/]+)";
      i += param[0].length;
      continue;
    }
    if (char === "(") {
      const close = source.indexOf(")", i);
      if (close === -1) throw new Error(`Unbalanced group in source: ${source}`);
      const inner = source.slice(i + 1, close);
      if (inner.startsWith("?")) {
        throw new Error(`Lookahead group not supported by Vercel matcher: ${source}`);
      }
      out += `(${inner})`;
      i = close + 1;
      continue;
    }
    out += /[.*+?^${}[\]|\\()]/.test(char) ? `\\${char}` : char;
    i += 1;
  }
  return new RegExp(`^${out}$`);
}

/** First rewrite whose source matches, or null when nothing rewrites the path. */
function resolve(path: string): string | null {
  for (const rewrite of rewrites) {
    if (toRegExp(rewrite.source).test(path)) return rewrite.destination;
  }
  return null;
}

// Every tab in the app's router, including the deepest dynamic ones.
const APP_TABS = [
  "/",
  "/login",
  "/onboarding",
  "/dashboard",
  "/search",
  "/settings",
  "/library",
  "/courses",
  "/courses/group-1",
  "/courses/group-1/lessons/lesson-1",
  "/remediate/content-1",
  "/content/content-1",
  "/a-tab-added-later",
];

const STATIC_ASSETS = [
  "/assets/index-abc123.js",
  "/assets/index-abc123.css",
  "/media/water-cycle.mp4",
  "/sw.js",
  "/registerSW.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/favicon.ico",
  "/favicon.png",
  "/og-image.png",
  "/pwa-512x512.png",
];

describe("vercel.json SPA rewrites", () => {
  it("only uses rewrite syntax the Vercel matcher accepts", () => {
    expect(rewrites.length).toBeGreaterThan(0);
    for (const rewrite of rewrites) {
      expect(() => toRegExp(rewrite.source)).not.toThrow();
    }
  });

  it("serves the app for every tab, not just the dashboard", () => {
    for (const tab of APP_TABS) {
      expect(resolve(tab), `tab ${tab} must load the app`).toBe("/index.html");
    }
  });

  it("never sends static files to index.html", () => {
    for (const asset of STATIC_ASSETS) {
      expect(resolve(asset), `asset ${asset} must not be rewritten`).not.toBe("/index.html");
    }
  });

  it("keeps a catch-all rewrite so new tabs work without editing the config", () => {
    expect(rewrites.at(-1)).toEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
