import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId, requireUserId } from "./lib/auth";

export const list = query({
  args: {
    grade: v.optional(v.string()),
    country: v.optional(v.string()),
    interest: v.optional(v.string()),
    subField: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewerId = await getUserId(ctx);
    const profiles = await ctx.db.query("profiles").collect();
    const limit = Math.min(args.limit ?? 24, 60);

    // Resolve connection states for the viewer in one pass.
    const myConnections = viewerId
      ? await ctx.db
          .query("connections")
          .withIndex("by_from", (q) => q.eq("fromUserId", viewerId))
          .collect()
      : [];
    const incoming = viewerId
      ? await ctx.db
          .query("connections")
          .withIndex("by_to", (q) => q.eq("toUserId", viewerId))
          .collect()
      : [];

    const stateFor = (userId: string) => {
      const sent = myConnections.find((c) => c.toUserId === userId);
      if (sent) {
        return { state: sent.status === "connected" ? ("connected" as const) : ("pending" as const), connectionId: sent._id };
      }
      const recv = incoming.find((c) => c.fromUserId === userId);
      if (recv) {
        return { state: recv.status === "connected" ? ("connected" as const) : ("incoming" as const), connectionId: recv._id };
      }
      return { state: "none" as const, connectionId: null };
    };

    const items: {
      profile: (typeof profiles)[number];
      user: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
      connection: "none" | "pending" | "connected" | "incoming";
      connectionId: ReturnType<typeof stateFor>["connectionId"];
      matchPct: number;
    }[] = [];

    for (const p of profiles) {
      if (p.userId === viewerId) continue;
      if (!p.onboardingComplete) continue;
      if (!p.publicProfile && stateFor(p.userId.toString()).state === "none") continue;
      if (args.grade && p.grade !== args.grade) continue;
      if (args.country && p.country !== args.country) continue;
      if (args.interest && !p.interests.includes(args.interest)) continue;
      if (args.subField && !p.subFields.includes(args.subField)) continue;
      if (args.search) {
        const q = args.search.toLowerCase();
        const hay = `${p.name} ${p.bio} ${p.town} ${p.interests.join(" ")} ${p.subFields.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const user = await ctx.db.get(p.userId);
      if (!user) continue;
      const peerInterests = p.interests;
      const overlap = args.subField ? p.subFields.filter((s) => s === args.subField).length : 0;
      const state = stateFor(p.userId.toString());
      items.push({
        profile: p,
        user,
        connection: state.state,
        connectionId: state.connectionId,
        matchPct: Math.min(99, 40 + (peerInterests.length > 0 ? peerInterests.length * 4 : 0) + overlap * 5 + (p.country === "Global" ? 5 : 0)),
      });
    }

    // Rank: connected first, then shared interests, then newest.
    const rank = (c: string) => (c === "connected" ? 0 : c === "incoming" ? 1 : c === "pending" ? 2 : 3);
    items.sort((a, b) => {
      const r = rank(a.connection) - rank(b.connection);
      if (r !== 0) return r;
      return b.profile.updatedAt - a.profile.updatedAt;
    });

    return items.slice(0, limit);
  },
});

export const myConnections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const [sent, received] = await Promise.all([
      ctx.db.query("connections").withIndex("by_from", (q) => q.eq("fromUserId", userId)).collect(),
      ctx.db.query("connections").withIndex("by_to", (q) => q.eq("toUserId", userId)).collect(),
    ]);
    const all = [...sent, ...received].filter((c) => c.status === "connected");
    const out = await Promise.all(
      all.map(async (c) => {
        const peerId = c.fromUserId === userId ? c.toUserId : c.fromUserId;
        const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", peerId)).first();
        const user = await ctx.db.get(peerId);
        if (!user) return null;
        return {
          connectionId: c._id,
          peerId,
          name: profile?.name ?? user.name ?? "Student",
          image: user.image ?? undefined,
          grade: profile?.grade ?? null,
          country: profile?.country ?? null,
          bio: profile?.bio ?? "",
          interests: profile?.interests ?? [],
          subFields: profile?.subFields ?? [],
        };
      }),
    );
    return out.filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

export const connectionState = query({
  args: { peerId: v.id("users") },
  handler: async (ctx, { peerId }) => {
    const viewerId = await getUserId(ctx);
    if (!viewerId) return { state: "none" as const, connectionId: null };
    const sent = await ctx.db
      .query("connections")
      .withIndex("by_pair", (q) => q.eq("fromUserId", viewerId).eq("toUserId", peerId))
      .first();
    if (sent) return { state: sent.status, connectionId: sent._id };
    const recv = await ctx.db
      .query("connections")
      .withIndex("by_pair", (q) => q.eq("fromUserId", peerId).eq("toUserId", viewerId))
      .first();
    if (recv) return { state: recv.status === "connected" ? "connected" : "incoming", connectionId: recv._id };
    return { state: "none" as const, connectionId: null };
  },
});

export const requestConnection = mutation({
  args: { toUserId: v.id("users") },
  handler: async (ctx, { toUserId }) => {
    const userId = await requireUserId(ctx);
    if (userId === toUserId) throw new Error("Cannot connect with yourself");
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_pair", (q) => q.eq("fromUserId", userId).eq("toUserId", toUserId))
      .first();
    if (existing) throw new Error("Connection already exists");
    await ctx.db.insert("connections", {
      fromUserId: userId,
      toUserId,
      status: "pending",
      createdAt: Date.now(),
    });
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).first();
    await ctx.db.insert("notifications", {
      userId: toUserId,
      type: "connection_request",
      title: "New connection request",
      body: `${profile?.name ?? "A student"} wants to connect with you`,
      href: "/app/peers",
      read: false,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const respondConnection = mutation({
  args: { connectionId: v.id("connections"), accept: v.boolean() },
  handler: async (ctx, { connectionId, accept }) => {
    const userId = await requireUserId(ctx);
    const conn = await ctx.db.get(connectionId);
    if (!conn || conn.toUserId !== userId) throw new Error("Not found");
    if (accept) {
      await ctx.db.patch(connectionId, { status: "connected", respondedAt: Date.now() });
      const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).first();
      await ctx.db.insert("notifications", {
        userId: conn.fromUserId,
        type: "connection_accepted",
        title: "Connection accepted",
        body: `${profile?.name ?? "A student"} accepted your connection request`,
        href: "/app/peers",
        read: false,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.delete(connectionId);
    }
    return true;
  },
});

export const listMessages = query({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, { connectionId }) => {
    const userId = await requireUserId(ctx);
    const conn = await ctx.db.get(connectionId);
    if (!conn || (conn.fromUserId !== userId && conn.toUserId !== userId)) {
      throw new Error("Not a participant");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
      .order("asc")
      .take(200);
    return messages.map((m) => ({
      ...m,
      mine: m.senderId === userId,
    }));
  },
});

export const sendMessage = mutation({
  args: { connectionId: v.id("connections"), body: v.string() },
  handler: async (ctx, { connectionId, body }) => {
    const userId = await requireUserId(ctx);
    if (!body.trim()) throw new Error("Empty message");
    const conn = await ctx.db.get(connectionId);
    if (!conn || (conn.fromUserId !== userId && conn.toUserId !== userId)) {
      throw new Error("Not a participant");
    }
    await ctx.db.insert("messages", {
      connectionId,
      senderId: userId,
      body: body.trim().slice(0, 2000),
      createdAt: Date.now(),
    });
    const recipient = conn.fromUserId === userId ? conn.toUserId : conn.fromUserId;
    await ctx.db.insert("notifications", {
      userId: recipient,
      type: "message",
      title: "New message",
      body: body.trim().slice(0, 120),
      href: "/app/peers",
      read: false,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const markMessagesRead = mutation({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, { connectionId }) => {
    const userId = await requireUserId(ctx);
    const conn = await ctx.db.get(connectionId);
    if (!conn || (conn.fromUserId !== userId && conn.toUserId !== userId)) return;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
      .filter((q) => q.and(q.neq(q.field("senderId"), userId), q.eq(q.field("readAt"), undefined)))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.patch(m._id, { readAt: Date.now() })));
    return messages.length;
  },
});
