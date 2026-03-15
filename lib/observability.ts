type LogLevel = "info" | "warn" | "error";

export function logApiEvent(
  event: string,
  data: Record<string, unknown> = {},
  level: LogLevel = "info"
) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}
