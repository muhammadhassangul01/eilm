"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

// Cache handler for `"use cache"`.
//
// Why this exists: the built-in handler is an in-memory LRU that deliberately
// drops an entry as soon as its `revalidate` window passes, because warming a
// replacement is wasted work for a store that may evict it before anyone reads
// it again. Here that policy turns into a multi-second Google Sheets round trip
// on the request that lands right after every revalidate window, and on every
// cold start, because there is no stale copy left to serve while the fresh one
// is generated.
//
// A disk-backed store has no such problem: entries survive restarts and are
// never evicted out from under a revalidation, so this handler serves until
// `expire` and lets Next.js regenerate in the background. Response times stay
// flat while data keeps refreshing on the normal `revalidate` cadence.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const log = process.env.NEXT_PRIVATE_DEBUG_CACHE
  ? (...args) => console.debug("DiskCacheHandler:", ...args)
  : () => {};

const MEMORY_LIMIT_ENTRIES = 48;
const MEMORY_LIMIT_BYTES = 96 * 1024 * 1024;
const DISK_LIMIT_BYTES = 512 * 1024 * 1024;

let cacheDir = null;
let dirReady = false;

const memory = new Map();
const pendingSets = new Map();
const tagState = new Map();
let memoryBytes = 0;
let tagsLoadedAt = 0;

function resolveDir() {
  const configured = process.env.USE_CACHE_DIR;
  return configured ? path.resolve(configured) : path.join(process.cwd(), ".next", "cache", "use-cache");
}

function entryPath(key) {
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return path.join(cacheDir, `${hash}.json`);
}

function tagsPath() {
  return path.join(cacheDir, "tags.json");
}

function ensureDir() {
  if (dirReady) {
    return true;
  }
  cacheDir = resolveDir();
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    dirReady = true;
  } catch (error) {
    log("mkdir failed, falling back to memory", error);
  }
  return dirReady;
}

function streamFromBytes(bytes) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function forget(key) {
  const existing = memory.get(key);
  if (existing) {
    memoryBytes -= existing.value.byteLength;
    memory.delete(key);
  }
}

function remember(key, stored) {
  forget(key);
  memory.set(key, stored);
  memoryBytes += stored.value.byteLength;

  while (memory.size > MEMORY_LIMIT_ENTRIES || memoryBytes > MEMORY_LIMIT_BYTES) {
    const oldest = memory.keys().next();
    if (oldest.done) {
      break;
    }
    const victim = memory.get(oldest.value);
    memory.delete(oldest.value);
    memoryBytes -= victim ? victim.value.byteLength : 0;
  }
}

function isExpired(stored) {
  return Boolean(stored.expire) && Date.now() > stored.timestamp + stored.expire * 1000;
}

function readEntry(key) {
  const cached = memory.get(key);
  if (cached) {
    if (isExpired(cached)) {
      forget(key);
    } else {
      remember(key, cached);
      return cached;
    }
  }

  if (!ensureDir()) {
    return null;
  }

  const file = entryPath(key);
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      log("read failed", error);
    }
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A truncated file can only come from an interrupted writer. Drop it rather
    // than serve a half-written snapshot.
    try {
      fs.unlinkSync(file);
    } catch {}
    return null;
  }

  if (!parsed || typeof parsed.value !== "string" || typeof parsed.timestamp !== "number") {
    return null;
  }

  const stored = {
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    stale: parsed.stale,
    timestamp: parsed.timestamp,
    expire: parsed.expire,
    revalidate: parsed.revalidate,
    value: Buffer.from(parsed.value, "base64"),
  };

  if (isExpired(stored)) {
    try {
      fs.unlinkSync(file);
    } catch {}
    return null;
  }

  remember(key, stored);
  return stored;
}

function writeEntry(key, stored) {
  if (!ensureDir()) {
    return;
  }

  const payload = JSON.stringify({
    tags: stored.tags,
    stale: stored.stale,
    timestamp: stored.timestamp,
    expire: stored.expire,
    revalidate: stored.revalidate,
    value: stored.value.toString("base64"),
  });

  if (payload.length > DISK_LIMIT_BYTES) {
    log("set", key, "skipped oversized entry", payload.length);
    return;
  }

  const file = entryPath(key);
  try {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, payload);
    fs.renameSync(tmp, file);
  } catch (error) {
    log("write failed", error);
  }
}

function loadTags(force) {
  if (!ensureDir()) {
    return;
  }

  const file = tagsPath();
  try {
    const stat = fs.statSync(file);
    if (!force && stat.mtimeMs === tagsLoadedAt) {
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    tagState.clear();
    for (const [tag, value] of Object.entries(parsed)) {
      tagState.set(tag, value);
    }
    tagsLoadedAt = stat.mtimeMs;
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      log("tag read failed", error);
    }
  }
}

function persistTags() {
  if (!ensureDir()) {
    return;
  }

  const file = tagsPath();
  try {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(tagState)));
    fs.renameSync(tmp, file);
    tagsLoadedAt = fs.statSync(file).mtimeMs;
  } catch (error) {
    log("tag write failed", error);
  }
}

function tagInfo(tag) {
  return tagState.get(tag);
}

function areTagsExpired(tags, timestamp) {
  const now = Date.now();
  for (const tag of tags) {
    const state = tagInfo(tag);
    if (!state || typeof state.expired !== "number") {
      continue;
    }
    if (state.expired <= now && state.expired > timestamp) {
      return true;
    }
  }
  return false;
}

function areTagsStale(tags, timestamp) {
  for (const tag of tags) {
    const state = tagInfo(tag);
    if (state && typeof state.stale === "number" && state.stale > timestamp) {
      return true;
    }
  }
  return false;
}

module.exports = {
  async get(cacheKey, softTags) {
    const pending = pendingSets.get(cacheKey);
    if (pending) {
      await pending;
    }

    const stored = readEntry(cacheKey);
    if (!stored) {
      log("get", cacheKey, "miss");
      return undefined;
    }

    const checkedTags = softTags ? stored.tags.concat(softTags) : stored.tags;
    if (areTagsExpired(checkedTags, stored.timestamp)) {
      log("get", cacheKey, "tag expired");
      return undefined;
    }

    const revalidate = areTagsStale(checkedTags, stored.timestamp) ? -1 : stored.revalidate;
    log("get", cacheKey, "hit", Date.now() - stored.timestamp, "ms old");

    return {
      tags: stored.tags,
      stale: stored.stale,
      timestamp: stored.timestamp,
      expire: stored.expire,
      revalidate,
      value: streamFromBytes(stored.value),
    };
  },

  async set(cacheKey, pendingEntry) {
    let release = () => {};
    const inFlight = new Promise((resolve) => {
      release = resolve;
    });
    pendingSets.set(cacheKey, inFlight);

    try {
      const entry = await pendingEntry;
      const bytes = Buffer.from(await new Response(entry.value).arrayBuffer());
      const stored = {
        tags: entry.tags || [],
        stale: entry.stale,
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
        value: bytes,
      };

      remember(cacheKey, stored);
      writeEntry(cacheKey, stored);
      log("set", cacheKey, "done", bytes.byteLength, "bytes");
    } catch (error) {
      log("set", cacheKey, "failed", error);
    } finally {
      pendingSets.delete(cacheKey);
      release();
    }
  },

  async refreshTags() {
    loadTags(false);
  },

  async getExpiration(tags) {
    loadTags(false);
    let expiration = 0;
    for (const tag of tags) {
      const entry = tagState.get(tag);
      if (entry && entry.expired) {
        expiration = Math.max(expiration, entry.expired);
      }
    }
    return expiration;
  },

  async updateTags(tags, durations) {
    loadTags(true);
    const now = Date.now();

    for (const tag of tags) {
      const existing = tagState.get(tag) || {};
      if (durations) {
        // `revalidateTag` with a profile: keep serving, refresh in the background
        // until the profile's `expire` elapses.
        const updates = { ...existing, stale: now };
        if (durations.expire !== undefined) {
          updates.expired = now + durations.expire * 1000;
        }
        tagState.set(tag, updates);
      } else {
        // No profile means the next read must regenerate rather than serve the
        // copy written before the mutation.
        tagState.set(tag, { ...existing, expired: now });
      }
    }

    persistTags();
    log("updateTags", tags, durations);
  },
};
