export type SafeFetchResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Wraps a single provider call so one failing source never aborts an entire
 * ingestion run. Per data-ingestion spec's "External API failures degrade
 * gracefully": the failure is recorded and the caller is expected to fall
 * back to whatever cached data it already has, rather than propagating.
 */
export async function safeFetch<T>(providerLabel: string, fn: () => Promise<T>): Promise<SafeFetchResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ingestion] ${providerLabel} call failed: ${message}`);
    return { ok: false, error: message };
  }
}
