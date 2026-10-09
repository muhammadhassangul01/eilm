// Boot warm-up for the portal.
//
// Two separate things need warming and they cannot be combined:
//
// 1. The Google Sheets client — minting the service-account token and opening
//    the TLS connection is most of a cold request. This is plain I/O, so it can
//    run here.
// 2. The `"use cache"` entries — those can only be filled by a real render. A
//    cached function invoked from here runs outside the App Router and throws
//    (`cacheLife() can only be called inside a "use cache"` function), so the
//    cache is warmed by fetching one public page over loopback instead.
//
// Neither runs before `register()` returns: the server is not listening yet and
// boot should not wait on Google.

const GOOGLE_WARM_TIMEOUT_MS = 15_000;
const HTTP_WARM_TIMEOUT_MS = 45_000;
const HTTP_WARM_RETRY_MS = 250;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  // Node's `ReadableByteStreamController.enqueue()` transfers (detaches) the
  // ArrayBuffer of every chunk it accepts, and a Buffer taken from Node's
  // 64 KiB pool is not detachable: the transfer throws
  // `TypeError: ArrayBuffer is not detachable and could not be cloned.`
  // Next writes the value of a `"use cache"` function into such a byte stream,
  // so filling the registrations cache failed on every login. Pooling is a
  // micro-optimisation; turning it off makes every Buffer detachable.
  Buffer.poolSize = 0;
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (process.env.PORTAL_WARMUP === "off") {
    return;
  }

  setTimeout(() => {
    void warmGoogleSheets();
  }, 0).unref?.();

  setTimeout(() => {
    void warmPortalOverHttp();
  }, 0).unref?.();
}

async function warmGoogleSheets() {
  const startedAt = Date.now();
  try {
    const { listSheetTabs } = await import("./lib/google-sheets");
    const sheetId = process.env.REGISTRATION_SHEET_ID;
    if (!sheetId) {
      return;
    }
    await withTimeout(listSheetTabs(sheetId), GOOGLE_WARM_TIMEOUT_MS, "google sheets");
    console.log(`[portal] google auth warmed in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.warn(
      `[portal] google warmup failed after ${Date.now() - startedAt}ms: ${messageOf(error)}`,
    );
  }
}

async function warmPortalOverHttp() {
  const url = `http://127.0.0.1:${resolvePort()}/student-portal`;
  const deadline = Date.now() + HTTP_WARM_TIMEOUT_MS;
  const startedAt = Date.now();

  // Retried because the listener is not open yet when `register()` runs; the
  // first successful response means the page rendered, which is what writes the
  // shared cache entries a real visitor would otherwise wait for.
  for (;;) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(HTTP_WARM_TIMEOUT_MS),
        headers: { accept: "text/html" },
      });
      if (response.ok) {
        await response.body?.cancel().catch(() => {});
        console.log(`[portal] snapshot warmed in ${Date.now() - startedAt}ms`);
        return;
      }
    } catch {
      // Server not listening yet, or the render failed. Both are worth retrying
      // until the deadline.
    }

    if (Date.now() > deadline) {
      console.warn(`[portal] snapshot warmup did not succeed within ${HTTP_WARM_TIMEOUT_MS}ms`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HTTP_WARM_RETRY_MS));
  }
}

function resolvePort(): number {
  const fromEnv = Number(process.env.PORT);
  if (Number.isInteger(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  const argv = process.argv;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "-p" || token === "--port") {
      const value = Number(argv[index + 1]);
      if (Number.isInteger(value) && value > 0) {
        return value;
      }
    }
    const inline = /^-p=?(\d+)$/.exec(token ?? "");
    if (inline?.[1]) {
      return Number(inline[1]);
    }
  }

  return 3000;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} warmup timed out after ${ms}ms`)), ms);
      timer.unref?.();
    }),
  ]);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
