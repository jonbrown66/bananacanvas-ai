type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  windowSeconds: number;
  source: "redis" | "memory";
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function callUpstash(path: string, token: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed: ${response.status}`);
  }

  return response.json() as Promise<{ result: number }>;
}

async function checkRedisLimit(options: RateLimitOptions, url: string, token: string): Promise<RateLimitResult> {
  const key = encodeURIComponent(options.key);
  const base = url.replace(/\/+$/, "");
  const incrUrl = `${base}/incr/${key}`;
  const { result } = await callUpstash(incrUrl, token);

  if (result === 1) {
    const expireUrl = `${base}/expire/${key}/${options.windowSeconds}`;
    await callUpstash(expireUrl, token);
  }

  return {
    allowed: result <= options.limit,
    count: result,
    remaining: Math.max(0, options.limit - result),
    windowSeconds: options.windowSeconds,
    source: "redis"
  };
}

function checkMemoryLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = memoryStore.get(options.key);

  if (!bucket || bucket.resetAt <= now) {
    memoryStore.set(options.key, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000
    });
    return {
      allowed: true,
      count: 1,
      remaining: Math.max(0, options.limit - 1),
      windowSeconds: options.windowSeconds,
      source: "memory"
    };
  }

  bucket.count += 1;
  memoryStore.set(options.key, bucket);

  return {
    allowed: bucket.count <= options.limit,
    count: bucket.count,
    remaining: Math.max(0, options.limit - bucket.count),
    windowSeconds: options.windowSeconds,
    source: "memory"
  };
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redis = getRedisConfig();
  if (redis) {
    try {
      return await checkRedisLimit(options, redis.url, redis.token);
    } catch {
      return checkMemoryLimit(options);
    }
  }
  return checkMemoryLimit(options);
}

export function extractClientIp(request: Request): string | null {
  const headers = request.headers;
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ].filter((value): value is string => Boolean(value && value.trim()));

  return candidates[0] ?? null;
}
