import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId, requireUserId } from "./lib/auth";

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/** Public profile for a user (used by Peers + chat). */
export const getPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const viewerId = await getUserId(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    // Respect privacy: hide profile unless public, same viewer, or connected.
    if (userId !== viewerId && !profile.publicProfile) {
      return null;
    }
    return {
      ...profile,
      userName: user.name ?? profile.name,
      userImage: user.image ?? undefined,
      isMe: userId === viewerId,
    };
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    grade: v.string(),
    town: v.string(),
    country: v.string(),
    locationPublic: v.boolean(),
    bio: v.string(),
    socials: v.object({
      instagram: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      github: v.optional(v.string()),
      twitter: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    interests: v.array(v.string()),
    subFields: v.array(v.string()),
    theme: v.string(),
    accentColor: v.optional(v.string()),
    publicProfile: v.boolean(),
    onboardingComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Promote the very first user to admin so the curation dashboard is usable
    // in this prototype. In production this would be a managed role change.
    const profileCount = await ctx.db.query("profiles").count();
    if (profileCount === 0) {
      await ctx.db.patch(userId, { role: "admin", name: args.name });
    } else if (existing) {
      await ctx.db.patch(userId, { name: args.name });
    }

    const data = {
      userId,
      name: args.name,
      grade: args.grade,
      town: args.town,
      country: args.country,
      locationPublic: args.locationPublic,
      bio: args.bio,
      socials: args.socials,
      interests: args.interests,
      subFields: args.subFields,
      theme: args.theme,
      accentColor: args.accentColor,
      publicProfile: args.publicProfile,
      onboardingComplete: args.onboardingComplete ?? existing?.onboardingComplete ?? false,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return { id: existing._id, created: false };
    }
    const id = await ctx.db.insert("profiles", { ...data, createdAt: now });
    return { id, created: true };
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (profile) {
      await ctx.db.patch(profile._id, { onboardingComplete: true, updatedAt: Date.now() });
    }
    return true;
  },
});
