import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logApiEvent } from "@/lib/observability";
import { checkRateLimit, extractClientIp } from "@/lib/security/rate-limit";

type InputMetric = {
  name?: unknown;
  value?: unknown;
  unit?: unknown;
  level?: unknown;
  tags?: unknown;
  ts?: unknown;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_METRICS_PER_REQUEST = 50;
const MAX_TAG_KEYS = 12;
const MAX_TAG_VALUE_LENGTH = 160;
const METRIC_NAME_PATTERN = /^[a-z][a-z0-9_.:-]{1,80}$/i;

const metricsDbClient =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

export async function POST(request: NextRequest) {
  try {
    const ip = extractClientIp(request);
    if (ip) {
      const limitResult = await checkRateLimit({
        key: `metrics:${ip}`,
        limit: 30,
        windowSeconds: 60
      });
      if (!limitResult.allowed) {
        logApiEvent("client.metric.rate_limited", { ip, source: limitResult.source }, "warn");
        return NextResponse.json({ ok: false }, { status: 429 });
      }
    }

    const body = await request.json();
    const incoming = Array.isArray(body?.metrics) ? (body.metrics as InputMetric[]) : [];

    const accepted = incoming
      .map((metric) => {
        if (typeof metric?.name !== "string") return null;
        if (!METRIC_NAME_PATTERN.test(metric.name)) return null;
        if (typeof metric?.value !== "number" || !Number.isFinite(metric.value)) return null;

        const level: "info" | "warn" | "error" =
          metric.level === "warn" || metric.level === "error" || metric.level === "info"
            ? (metric.level as "info" | "warn" | "error")
            : "info";

        const tags =
          typeof metric.tags === "object" && metric.tags !== null && !Array.isArray(metric.tags)
            ? Object.fromEntries(
                Object.entries(metric.tags as Record<string, unknown>)
                  .slice(0, MAX_TAG_KEYS)
                  .map(([key, value]) => [
                    key.slice(0, 80),
                    typeof value === "string" ? value.slice(0, MAX_TAG_VALUE_LENGTH) : value
                  ])
                  .filter(([, value]) =>
                    value === null ||
                    typeof value === "string" ||
                    typeof value === "number" ||
                    typeof value === "boolean"
                  )
              )
            : {};

        return {
          name: metric.name,
          value: Number(metric.value),
          unit: typeof metric.unit === "string" ? metric.unit.slice(0, 24) : "ms",
          level,
          tags,
          ts: typeof metric.ts === "string" ? metric.ts : new Date().toISOString()
        };
      })
      .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))
      .slice(0, MAX_METRICS_PER_REQUEST);

    for (const metric of accepted) {
      logApiEvent(
        "client.metric",
        {
          metric: metric.name,
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
          ts: metric.ts
        },
        metric.level
      );
    }

    let persisted = 0;
    if (metricsDbClient && accepted.length) {
      const rows = accepted.map((metric) => ({
        metric_name: metric.name,
        metric_value: metric.value,
        unit: metric.unit,
        level: metric.level,
        tags: metric.tags,
        observed_at: metric.ts
      }));

      const { error } = await metricsDbClient
        .from("client_performance_metrics")
        .insert(rows as any[]);
      if (error) {
        logApiEvent(
          "client.metric.persist_failed",
          {
            message: error.message,
            code: (error as any)?.code ?? null
          },
          "warn"
        );
      } else {
        persisted = rows.length;
      }
    }

    return NextResponse.json({ ok: true, accepted: accepted.length, persisted });
  } catch (error) {
    logApiEvent("client.metric.failed", { message: (error as Error)?.message ?? "unknown" }, "warn");
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
