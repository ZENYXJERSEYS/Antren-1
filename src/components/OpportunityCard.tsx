import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BadgeCheck, Bookmark } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { CATEGORY_MAP } from "@/lib/taxonomy";
import { daysUntil, deadlineLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OpportunityListItem = {
  _id: Id<"opportunities">;
  _creationTime: number;
  title: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  provider: string;
  category: string;
  subFields: string[];
  location: string;
  country: string;
  remote: boolean;
  eligibility: string;
  deadline: number;
  rollingDeadline: boolean;
  duration: string;
  stipendText: string;
  isFree: boolean;
  verificationStatus: string;
  featured: boolean;
  isNew: boolean;
  views: number;
  createdAt: number;
  updatedAt: number;
  media: { type: string; url: string; posterUrl?: string; emoji?: string; gradient?: string }[];
  tags: string[];
  matchScore?: number;
  matchReasons?: string[];
};

export function OpportunityCard({
  opp,
  saved = false,
  onSavedChange,
}: {
  opp: OpportunityListItem;
  saved?: boolean;
  onSavedChange?: (id: string, saved: boolean) => void;
}) {
  const toggleSave = useMutation(api.saves.toggle);
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 260, damping: 22 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 260, damping: 22 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const resetTilt = () => {
    mx.set(0);
    my.set(0);
  };

  const cover = opp.media[0];
  const days = daysUntil(opp.deadline, opp.rollingDeadline);
  const closing = days !== null && days >= 0 && days <= 7;
  const category = CATEGORY_MAP[opp.category];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 900 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group h-full"
    >
      <Link
        to={`/app/opportunity/${opp._id}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.28)]"
      >
        <div
          className="relative flex h-32 items-center justify-center overflow-hidden"
          style={{ background: cover?.gradient ?? "linear-gradient(135deg,#10B981,#059669)" }}
        >
          <span className="text-4xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
            {cover?.emoji ?? "✨"}
          </span>
          <span className="absolute top-2.5 left-3 rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            {category?.label ?? opp.category}
          </span>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {opp.isNew && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                New
              </span>
            )}
            {opp.verificationStatus === "verified" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <BadgeCheck className="size-3" /> Verified
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className={cn(closing && "font-semibold text-amber-700")}>
              {deadlineLabel(opp.deadline, opp.rollingDeadline)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{opp.remote ? "Remote" : opp.location}</span>
          </div>
          <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-1">
            {opp.title}
          </h3>
          <p className="text-xs font-medium text-muted-foreground">{opp.provider}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
            {opp.shortDescription}
          </p>

          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              {opp.isFree ? "Free" : opp.stipendText || (opp.isFree ? "Free" : "See details")}
            </span>
            <div className="flex items-center gap-2">
              {typeof opp.matchScore === "number" && opp.matchScore > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                  title={opp.matchReasons?.join(", ")}
                >
                  {opp.matchScore}% match
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("size-7 cursor-pointer", saved && "text-primary")}
                aria-label={saved ? "Remove from saved" : "Save opportunity"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleSave({ opportunityId: opp._id }).then((res) => {
                    onSavedChange?.(opp._id, res.saved);
                  });
                }}
              >
                <Bookmark className={cn("size-4", saved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
