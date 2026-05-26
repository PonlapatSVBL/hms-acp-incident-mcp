/**
 * Runtime configuration, read from environment variables.
 *
 * Transport mirrors web-acp's src/app/untils/http-service.ts (httpPostService):
 * every call is POSTed to `${SERVER}/api.php`. SERVER defaults to the api-acp
 * production base (https://api.humansoft.co.th).
 */
export interface AcpConfig {
  /** api-acp base URL, e.g. https://api.humansoft.co.th (no trailing slash). */
  baseUrl: string;
  /** Path of the single PHP front controller. */
  apiPath: string;
  /** Bearer token sent as `Authorization: Bearer {token}`. */
  token: string;
  /**
   * Current user's raw id. When set, `identify_user_id` (base64) is injected
   * into every request body — the spec lists it as a context param the client
   * adds automatically. Optional: omit if the backend derives it from the JWT.
   */
  userId?: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it before starting the MCP server.`
    );
  }
  return v.trim();
}

export function loadConfig(): AcpConfig {
  const rawBase = (process.env.ACP_API_BASE_URL || "https://api.humansoft.co.th").trim();
  const baseUrl = rawBase.replace(/\/+$/, ""); // strip trailing slashes
  const apiPath = (process.env.ACP_API_PATH || "/api.php").trim();
  const timeoutMs = Number(process.env.ACP_API_TIMEOUT_MS || "30000");

  return {
    baseUrl,
    apiPath: apiPath.startsWith("/") ? apiPath : `/${apiPath}`,
    token: required("ACP_API_TOKEN"),
    userId: process.env.ACP_USER_ID?.trim() || undefined,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000,
  };
}
