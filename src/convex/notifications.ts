import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId, requireUserId } from "./lib/auth";

/**
 * Notification center. Combines stored notifications (connection requests,
 * messages, accepts) with computed ones (deadline reminders for saved
 * opportunities, recommendation alerts for new matches).
 */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return { items: [], unread: 0 };

    const [stored, profile, savedRows, myOppIds, opps] = await Promise.all([
      ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(40),
      ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).first(),
      ctx.db.query("savedOpportunities").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      (async () => {
        const rows = await ctx.db.query("savedOpportunities").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
        return rows.map((r) => r.opportunityId);
      })(),
      ctx.db.query("opportunities").withIndex("by_status", (q) => q.eq("status", "published")).take(500),
    ]);

    void myOppIds;

    const now = Date.now();
    const DAY = 86_400_000;
    const items: {
      id: string;
      type: string;
      title: string;
      body: string;
      href: string;
      read: boolean;
      createdAt: number;
    }[] = [];

    for (const n of stored) {
      items.push({
        id: n._id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.read,
        createdAt: n.createdAt,
      });
    }

    // Deadline reminders from saved opportunities.
    for (const row of savedRows) {
      const opp = opps.find((o) => o._id === row.opportunityId);
      if (!opp) continue;
      const days = Math.ceil((opp.deadline - now) / DAY);
      if (!opp.rollingDeadline && days >= 0 && days <= 14) {
        items.push({
          id: `deadline-${opp._id}`,
          type: "deadline_reminder",
          title: `Deadline soon: ${opp.title}`,
          body: `Closes in ${days} day${days === 1 ? "" : "s"}`,
          href: `/app/opportunity/${opp._id}`,
          read: false,
          createdAt: now - (14 - days) * DAY,
        });
      }
    }

    // Recommendation alert: new opportunities matching profile interests.
    if (profile && profile.interests.length > 0) {
      const fresh = opps.filter(
        (o) =>
          o.isNew &&
          o.createdAt > now - 21 * DAY &&
          (profile.interests.includes(o.category) ||
            o.subFields.some((s) => profile.subFields.includes(s))),
      );
      if (fresh.length > 0) {
        items.push({
          id: "recommendation-alert",
          type: "recommendation",
          title: `${fresh.length} new ${fresh.length === 1 ? "opportunity matches" : "opportunities match"} your interests`,
          body: fresh
            .slice(0, 3)
            .map((o) => o.title)
            .join(" · "),
          href: "/app/for-you?sort=newest",
          read: false,
          createdAt: now - 60_000,
        });
      }
    }

    items.sort((a, b) => b.createdAt - a.createdAt);
    const unread = items.filter((i) => !i.read).length;
    return { items: items.slice(0, 30), unread };
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    await Promise.all(rows.map((r) => ctx.db.patch(r._id, { read: true })));
    return rows.length;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const n = await ctx.db.get(id);
    if (n && n.userId === userId && !n.read) {
      await ctx.db.patch(id, { read: true });
    }
    return true;
  },
});
