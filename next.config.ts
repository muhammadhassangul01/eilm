import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The built-in `"use cache"` handler is an in-memory LRU that drops an entry
  // the moment its `revalidate` window closes, so the next request has to
  // regenerate it synchronously. Disk-backed entries outlive that window, so
  // Next serves the stale copy and refreshes it in the background instead.
  cacheHandlers: {
    default: require.resolve("./cache-handlers/disk.js"),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
