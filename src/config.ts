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
  /** Username for identifier_user login. */
  username: string;
  /** Password for identifier_user login. */
  password: string;
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
  const rawBase = (process.env.ACP_API_BASE_URL || "https://core-acp.humansoft.co.th").trim();
  const baseUrl = rawBase.replace(/\/+$/, ""); // strip trailing slashes
  const apiPath = (process.env.ACP_API_PATH || "/api.php").trim();
  const timeoutMs = Number(process.env.ACP_API_TIMEOUT_MS || "30000");

  return {
    baseUrl,
    apiPath: apiPath.startsWith("/") ? apiPath : `/${apiPath}`,
    username: required("ACP_USERNAME"),
    password: required("ACP_PASSWORD"),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000,
  };
}
