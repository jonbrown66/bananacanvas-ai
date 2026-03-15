'use client';

type MetricPayload = {
  name: string;
  value: number;
  unit?: string;
  level?: 'info' | 'warn' | 'error';
  tags?: Record<string, string | number | boolean | null>;
  ts?: string;
};

type MetricsEnvelope = {
  metrics: MetricPayload[];
};

declare global {
  interface Window {
    __BANANA_METRICS__?: MetricPayload[];
  }
}

const endpoint = '/api/metrics';
const queue: MetricPayload[] = [];
let flushTimer: number | null = null;

function normalizeMetric(metric: MetricPayload): MetricPayload {
  return {
    ts: new Date().toISOString(),
    level: metric.level ?? 'info',
    unit: metric.unit ?? 'ms',
    ...metric
  };
}

function flushQueue() {
  flushTimer = null;
  if (!queue.length) return;

  const batch = queue.splice(0, queue.length);
  const payload: MetricsEnvelope = { metrics: batch };
  const text = JSON.stringify(payload);

  if (typeof window !== 'undefined') {
    window.__BANANA_METRICS__ = [...(window.__BANANA_METRICS__ ?? []), ...batch].slice(-300);
  }

  if (navigator.sendBeacon) {
    const blob = new Blob([text], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: text,
    keepalive: true
  }).catch(() => {
    // Swallow telemetry send failures to avoid impacting UX.
  });
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(flushQueue, 800);
}

export function reportClientMetric(metric: MetricPayload) {
  if (typeof window === 'undefined') return;
  queue.push(normalizeMetric(metric));
  scheduleFlush();
}

export function markRouteStart(toPath: string) {
  if (typeof window === 'undefined') return;
  (window as any).__BANANA_ROUTE_PENDING__ = {
    toPath,
    fromPath: window.location.pathname,
    startAt: performance.now()
  };
}

export function consumeRouteMetric(currentPath: string) {
  if (typeof window === 'undefined') return null;
  const pending = (window as any).__BANANA_ROUTE_PENDING__ as {
    toPath: string;
    fromPath: string;
    startAt: number;
  } | null;

  if (!pending) return null;

  const normalize = (v: string) => (v.endsWith('/') && v.length > 1 ? v.slice(0, -1) : v);
  const expected = normalize(pending.toPath);
  const actual = normalize(currentPath);
  if (expected !== actual) return null;

  delete (window as any).__BANANA_ROUTE_PENDING__;
  return {
    duration: Math.max(0, performance.now() - pending.startAt),
    fromPath: pending.fromPath,
    toPath: pending.toPath
  };
}

export function markRouteFromAnchor(anchorHref: string) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(anchorHref, window.location.href);
    if (url.origin !== window.location.origin) return;
    markRouteStart(url.pathname);
  } catch {
    // Ignore invalid href values.
  }
}

const FLOW_STORAGE_PREFIX = '__BANANA_FLOW__';

type FlowPayload = {
  startedAt: number;
  tags?: Record<string, string | number | boolean | null>;
};

export function markFlowStart(
  flowName: string,
  tags?: Record<string, string | number | boolean | null>
) {
  if (typeof window === 'undefined') return;
  try {
    const payload: FlowPayload = {
      startedAt: Date.now(),
      tags
    };
    window.sessionStorage.setItem(`${FLOW_STORAGE_PREFIX}:${flowName}`, JSON.stringify(payload));
  } catch {
    // Ignore sessionStorage failures.
  }
}

export function consumeFlowMetric(flowName: string) {
  if (typeof window === 'undefined') return null;
  const key = `${FLOW_STORAGE_PREFIX}:${flowName}`;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    window.sessionStorage.removeItem(key);

    const payload = JSON.parse(raw) as FlowPayload;
    if (typeof payload.startedAt !== 'number') return null;

    return {
      duration: Math.max(0, Date.now() - payload.startedAt),
      tags: payload.tags ?? {}
    };
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}
