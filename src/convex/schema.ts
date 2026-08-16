import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const verificationStatusValidator = v.union(
  v.literal("verified"),
  v.literal("recently_verified"),
  v.literal("deadline_updated"),
  v.literal("expired"),
  v.literal("unverified"),
);
export type VerificationStatus = Infer<typeof verificationStatusValidator>;

export const applicationStatusValidator = v.union(
  v.literal("saved"),
  v.literal("researching"),
  v.literal("drafted"),
  v.literal("submitted"),
  v.literal("interview"),
  v.literal("accepted"),
  v.literal("rejected"),
);
export type ApplicationStatus = Infer<typeof applicationStatusValidator>;

export const opportunityStatusValidator = v.union(
  v.literal("published"),
  v.literal("draft"),
  v.literal("archived"),
);

const socialsValidator = v.object({
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  github: v.optional(v.string()),
  twitter: v.optional(v.string()),
  email: v.optional(v.string()),
});

const mediaValidator = v.array(
  v.object({
    type: v.string(), // "video" | "image" | "cover"
    url: v.string(),
    posterUrl: v.optional(v.string()),
    emoji: v.optional(v.string()),
    gradient: v.optional(v.string()),
  }),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ------------------------------------------------------------------
    // Antren product tables
    // ------------------------------------------------------------------

    /**
     * The opportunity database. Designed for tens of thousands of records:
     * every hot filter path has a dedicated index, and full-text search is
     * backed by a Convex search index over `searchText`.
     */
    opportunities: defineTable({
      title: v.string(),
      subtitle: v.string(),
      description: v.string(),
      shortDescription: v.string(),
      provider: v.string(),
      officialUrl: v.string(),
      category: v.string(), // primary category slug (see src/lib/taxonomy.ts)
      subFields: v.array(v.string()),
      location: v.string(),
      country: v.string(),
      remote: v.boolean(),
      eligibility: v.string(),
      gradeEligibility: v.array(v.string()), // e.g. ["9","10","11","12"] | ["college"]
      collegeOnly: v.boolean(),
      cost: v.optional(v.number()), // USD
      isFree: v.boolean(),
      currency: v.string(),
      stipend: v.optional(v.number()), // USD
      stipendText: v.string(),
      deadline: v.number(), // epoch ms; rolling deadlines use a far-future date
      rollingDeadline: v.boolean(),
      duration: v.string(),
      applicationMethod: v.string(),
      requiredDocuments: v.array(v.string()),
      verificationStatus: verificationStatusValidator,
      lastVerifiedAt: v.optional(v.number()),
      verificationNote: v.string(),
      status: opportunityStatusValidator,
      media: mediaValidator,
      tags: v.array(v.string()),
      featured: v.boolean(),
      isNew: v.boolean(),
      views: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      searchText: v.string(),
      /** Stable external identifier from the source dataset (e.g. "Opportunity #40001").
       *  Used as the idempotency key for bulk imports so re-imports never duplicate. */
      sourceId: v.optional(v.string()),
    })
      .index("by_deadline", ["deadline"])
      .index("by_category", ["category", "deadline"])
      .index("by_country", ["country"])
      .index("by_verification", ["verificationStatus"])
      .index("by_provider", ["provider"])
      .index("by_status", ["status", "deadline"])
      .index("by_sourceId", ["sourceId"])
      .searchIndex("search_opportunities", {
        searchField: "searchText",
        filterFields: ["category", "country", "verificationStatus", "status"],
      }),

    /** One per user — the public profile + preferences. */
    profiles: defineTable({
      userId: v.id("users"),
      name: v.string(),
      grade: v.string(), // "9" | "10" | "11" | "12" | "college" | "other"
      town: v.string(),
      country: v.string(),
      locationPublic: v.boolean(),
      bio: v.string(),
      socials: socialsValidator,
      interests: v.array(v.string()), // primary category slugs
      subFields: v.array(v.string()), // domain slugs
      theme: v.string(), // "light" | "dark" | "espresso" | "custom"
      accentColor: v.optional(v.string()),
      publicProfile: v.boolean(),
      onboardingComplete: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_userId", ["userId"])
      .index("by_country", ["country"])
      .index("by_grade", ["grade"]),

    savedOpportunities: defineTable({
      userId: v.id("users"),
      opportunityId: v.id("opportunities"),
      savedAt: v.number(),
    })
      .index("by_user", ["userId", "savedAt"])
      .index("by_opportunity", ["opportunityId"]),

    /** The "Resume Perfection" application pipeline. */
    applications: defineTable({
      userId: v.id("users"),
      opportunityId: v.id("opportunities"),
      status: applicationStatusValidator,
      notes: v.optional(v.string()),
      updatedAt: v.number(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"])
      .index("by_opportunity", ["opportunityId"]),

    connections: defineTable({
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
      status: v.union(v.literal("pending"), v.literal("connected")),
      createdAt: v.number(),
      respondedAt: v.optional(v.number()),
    })
      .index("by_from", ["fromUserId", "status"])
      .index("by_to", ["toUserId", "status"])
      .index("by_pair", ["fromUserId", "toUserId"]),

    messages: defineTable({
      connectionId: v.id("connections"),
      senderId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
      readAt: v.optional(v.number()),
    }).index("by_connection", ["connectionId", "createdAt"]),

    notifications: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("connection_request"),
        v.literal("connection_accepted"),
        v.literal("message"),
        v.literal("system"),
      ),
      title: v.string(),
      body: v.string(),
      href: v.string(),
      read: v.boolean(),
      createdAt: v.number(),
    }).index("by_user", ["userId", "createdAt"]),

    /** Implicit signals used for personalization. */
    opportunityViews: defineTable({
      userId: v.id("users"),
      opportunityId: v.id("opportunities"),
      viewedAt: v.number(),
    })
      .index("by_user", ["userId", "viewedAt"])
      .index("by_opportunity", ["opportunityId"]),

    searchQueries: defineTable({
      userId: v.id("users"),
      query: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId", "createdAt"]),

    /** Tiny key/value store for one-time data migrations and housekeeping. */
    appFlags: defineTable({
      key: v.string(),
      value: v.any(),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
