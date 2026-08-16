/**
 * Minimal Cloudflare D1 client for Convex node actions.
 *
 * Talks directly to the official D1 REST API (no SDK required):
 *   POST {base}/accounts/{account_id}/d1/database/{database_id}/query
 *
 * Requires these env vars (set in the project's Keys/API keys tab):
 *   - CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID
 *   - CLOUDFLARE_API_TOKEN   — API token with "D1 Edit" permission
 *   - D1_DATABASE_ID         — the database ID of your D1 database
 *   - D1_HTTP_API_URL        — optional override; defaults to the Cloudflare API
 */

export interface D1StatementResult {
  success: boolean;
  results: Record<string, unknown>[];
  meta?: {
    rows_read?: number;
    rows_written?: number;
  };
  errors?: { code?: number; message: string }[];
}

interface D1ApiResponse {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: D1StatementResult[];
}

export function getD1Config() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const database = process.env.D1_DATABASE_ID;
  const baseUrl =
    process.env.D1_HTTP_API_URL ?? "https://api.cloudflare.com/client/v4";

  const missing: string[] = [];
  if (!account) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!apiToken) missing.push("CLOUDFLARE_API_TOKEN");
  if (!database) missing.push("D1_DATABASE_ID");
  if (missing.length > 0) {
    throw new Error(
      `Cloudflare D1 is missing required env vars: ${missing.join(", ")}. Add them in the project's Keys tab.`,
    );
  }

  return { account, apiToken, database, baseUrl };
}

/** Executes one SQL statement against D1 and returns its rows. */
export async function queryD1(
  sql: string,
  params: unknown[] = [],
): Promise<D1StatementResult> {
  const { account, apiToken, database, baseUrl } = getD1Config();

  const url = `${baseUrl}/accounts/${account}/d1/database/${database}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `D1 API request failed (${response.status}): ${body.slice(0, 500)}`,
    );
  }

  const payload = (await response.json()) as D1ApiResponse;

  if (!payload.success) {
    const detail = payload.errors?.map((e) => e.message).join("; ");
    throw new Error(`D1 API error: ${detail ?? "unknown error"}`);
  }

  const statement = payload.result?.[0];
  if (!statement || statement.success === false) {
    const detail = statement?.errors?.map((e) => e.message).join("; ");
    throw new Error(`D1 query error: ${detail ?? "query failed"}`);
  }

  return statement;
}
