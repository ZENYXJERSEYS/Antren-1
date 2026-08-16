"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { queryD1 } from "./lib/d1";

/**
 * Cloudflare D1 integration for Antren.
 *
 * D1 is used for lightweight engagement analytics (opportunity views, saves,
 * shares, applies) that complement the Convex catalog. All functions here are
 * node actions that talk to D1 over its REST API — set CLOUDFLARE_ACCOUNT_ID,
 * CLOUDFLARE_API_TOKEN and D1_DATABASE_ID in the project's Keys tab first.
 */

/** Creates the D1 table used by Antren. Idempotent — safe to re-run. */
export const initialize = action({
  handler: async () => {
    await queryD1(`
      CREATE TABLE IF NOT EXISTS opportunity_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opportunity_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryD1(`
      CREATE INDEX IF NOT EXISTS idx_opportunity_events_type
      ON opportunity_events (event_type)
    `);
    return { ok: true };
  },
});

/**
 * Runs a read-only SQL statement against D1. Useful for inspecting data and
 * verifying the connection. Writes must go through recordEvent (or your own
 * actions) — this endpoint refuses anything but SELECT/PRAGMA/EXPLAIN.
 */
export const runQuery = action({
  args: {
    sql: v.string(),
    params: v.optional(v.array(v.any())),
  },
  handler: async (_ctx, { sql, params }) => {
    const trimmed = sql.trimStart().toLowerCase();
    if (!/^(select|pragma|explain)\b/.test(trimmed)) {
      throw new Error(
        "runQuery only allows read-only statements (SELECT / PRAGMA / EXPLAIN). Use recordEvent for writes.",
      );
    }
    return await queryD1(sql, params ?? []);
  },
});

/** Records an opportunity engagement event in D1. */
export const recordEvent = action({
  args: {
    opportunityId: v.string(),
    eventType: v.union(
      v.literal("view"),
      v.literal("save"),
      v.literal("share"),
      v.literal("apply"),
    ),
    userId: v.optional(v.string()),
  },
  handler: async (_ctx, { opportunityId, eventType, userId }) => {
    await queryD1(
      `INSERT INTO opportunity_events (opportunity_id, event_type, user_id)
       VALUES (?, ?, ?)`,
      [opportunityId, eventType, userId ?? null],
    );
    return { ok: true };
  },
});

/** Returns per-type event counts and the total number of events from D1. */
export const getStats = action({
  handler: async () => {
    const result = await queryD1(
      `SELECT event_type, COUNT(*) AS count
       FROM opportunity_events
       GROUP BY event_type
       ORDER BY count DESC`,
    );
    const total = result.results.reduce(
      (sum, row) => sum + Number(row.count ?? 0),
      0,
    );
    return { byType: result.results, total };
  },
});
