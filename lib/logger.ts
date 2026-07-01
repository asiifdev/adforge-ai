// Minimal structured error logger. Route handlers catch all errors to return
// a clean JSON envelope to the client, which otherwise silently drops the
// original stack — this at least gets it into stdout/stderr for log capture.
export function logError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      context,
      message,
      stack,
      timestamp: new Date().toISOString(),
    })
  );
}
