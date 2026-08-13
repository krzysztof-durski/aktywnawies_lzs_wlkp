// Pages Functions has no Rate Limiting binding, so this replaces it with a fixed-window
// counter in the SESSION KV namespace. Not atomic under concurrent requests, but that's an
// acceptable tradeoff for throttling login brute-force attempts on a low-traffic site.
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;

export async function checkLoginRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  const key = `ratelimit:login:${ip}`;
  const current = await kv.get(key);
  const count = current ? Number(current) : 0;
  if (count >= LOGIN_RATE_LIMIT) return false;
  await kv.put(key, String(count + 1), { expirationTtl: LOGIN_RATE_LIMIT_WINDOW_SECONDS });
  return true;
}
