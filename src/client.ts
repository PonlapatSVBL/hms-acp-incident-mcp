import type { AcpConfig } from "./config.js";

/**
 * Base64-encode a scalar the way the web-acp frontend does (btoa). For the
 * numeric/string ids used here this is equivalent to a UTF-8 base64.
 */
function b64(value: unknown): string {
  return Buffer.from(String(value), "utf8").toString("base64");
}

/**
 * Encode ids the way api.php expects them.
 *
 * Per the spec's auth.notes, the frontend base64-encodes (btoa) every field
 * whose name ends in `_id`, and api.php base64-decodes any such key on arrival.
 * Two array params carry ids under the bare key `id` (member[].id, feature[].id)
 * and are encoded specially. Everything else — including nested ids inside
 * `list_card` — is passed through untouched, matching the frontend exactly.
 */
export function encodeIds(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (key.endsWith("_id")) {
      out[key] = b64(value);
    } else if ((key === "member" || key === "feature") && Array.isArray(value)) {
      out[key] = value.map((item) => {
        if (item && typeof item === "object" && "id" in (item as Record<string, unknown>)) {
          const rec = item as Record<string, unknown>;
          return { ...rec, id: b64(rec.id) };
        }
        return item;
      });
    } else {
      out[key] = value;
    }
  }
  return out;
}

export interface RpcConstants {
  _compgrp: string;
  _comp: string;
  _action: string;
}

export class AcpApiError extends Error {
  constructor(
    message: string,
    readonly details?: { httpStatus?: number; envelopeCode?: string; body?: unknown }
  ) {
    super(message);
    this.name = "AcpApiError";
  }
}

/**
 * Thin RPC-over-POST client for the api-acp front controller.
 *
 * The body is `{ _compgrp, _comp, _action, ...encodedParams }`; the backend
 * routes to modules/{_compgrp}/{_comp}/{_action}.php. Responses use an envelope
 * `{ code, message, payload }` where `code` is a string (e.g. "200"); the
 * backend returns HTTP 200 even for envelope code "400" internal errors, so we
 * inspect the envelope rather than just the HTTP status.
 */
export class AcpClient {
  constructor(private readonly config: AcpConfig) {}

  private get url(): string {
    return `${this.config.baseUrl}${this.config.apiPath}`;
  }

  async call(
    constants: RpcConstants,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    // identify_user_id is a context param the client adds to every call; the
    // encoder base64-encodes it because the key ends in `_id`.
    const withContext: Record<string, unknown> = { ...params };
    if (this.config.userId) {
      withContext.identify_user_id = this.config.userId;
    }

    const body = {
      ...constants,
      ...encodeIds(withContext),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let res: Response;
    try {
      res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new AcpApiError(`Request timed out after ${this.config.timeoutMs}ms`);
      }
      throw new AcpApiError(
        `Network error calling ${this.url}: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON response (e.g. PHP fatal / HTML error page).
      if (!res.ok) {
        throw new AcpApiError(`HTTP ${res.status} ${res.statusText}`, {
          httpStatus: res.status,
          body: text.slice(0, 2000),
        });
      }
      throw new AcpApiError("Response was not valid JSON", {
        httpStatus: res.status,
        body: text.slice(0, 2000),
      });
    }

    if (!res.ok) {
      throw new AcpApiError(`HTTP ${res.status} ${res.statusText}`, {
        httpStatus: res.status,
        body: parsed,
      });
    }

    // Inspect the application envelope. `code` may be string or number.
    const envelope = parsed as { code?: unknown; message?: unknown } | null;
    const code = envelope && envelope.code !== undefined ? String(envelope.code) : undefined;
    if (code !== undefined && code !== "200") {
      const message =
        envelope && typeof envelope.message === "string" && envelope.message
          ? envelope.message
          : `Backend returned envelope code ${code}`;
      throw new AcpApiError(message, { envelopeCode: code, body: parsed });
    }

    return parsed;
  }
}
