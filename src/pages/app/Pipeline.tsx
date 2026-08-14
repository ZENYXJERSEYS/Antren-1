import { ArrowRight, KanbanSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PIPELINE_STAGES, REJECTED_STAGE } from "@/lib/taxonomy";
import { deadlineLabel } from "@/lib/format";

type StageStatus = "saved" | "researching" | "drafted" | "submitted" | "interview" | "accepted" | "rejected";

type Tracked = {
  _id: Id<"applications">;
  opportunityId: Id<"opportunities">;
  status: StageStatus;
  notes?: string;
  updatedAt: number;
  opportunity: {
    _id: Id<"opportunities">;
    title: string;
    provider: string;
    deadline: number;
    rollingDeadline: boolean;
    media: { emoji?: string; gradient?: string }[];
  };
};

export default function Pipeline() {
  const data = useQuery(api.applications.pipeline);
  const setStatus = useMutation(api.applications.setStatus);
  const remove = useMutation(api.applications.remove);

  const stages = [...PIPELINE_STAGES, REJECTED_STAGE];

  const byStage = (status: string) =>
    (data?.tracked ?? []).filter((t) => t.status === status) as Tracked[];

  const nextOf = (status: string) => {
    const idx = stages.findIndex((s) => s.value === status);
    return idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;
  };

  return (
    <div className="px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KanbanSquare className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pipeline</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data ? `${data.total} opportunities in motion` : "Loading…"}
            </p>
          </div>
        </div>
        <Link to="/app/explore">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
            Find more <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const list = byStage(stage.value);
          return (
            <div key={stage.value} className="flex w-72 shrink-0 flex-col rounded-2xl border bg-secondary/50 p-3">
              <div className="flex items-center gap-2 px-1 pb-3">
                <span className="text-sm">{stage.emoji}</span>
                <span className="text-sm font-semibold">{stage.label}</span>
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {list.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {list.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nothing here yet</p>
                )}
                {list.map((item) => {
                  const cover = item.opportunity.media[0];
                  const next = nextOf(item.status);
                  return (
                    <div key={item._id} className="rounded-xl border bg-card p-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/app/opportunity/${item.opportunity._id}`}
                          className="min-w-0"
                        >
                          <p className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">
                            {item.opportunity.title}
                          </p>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 shrink-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {stages
                              .filter((s) => s.value !== item.status)
                              .map((s) => (
                                <DropdownMenuItem
                                  key={s.value}
                                  className="cursor-pointer"
                                  onClick={() =>
                                    void setStatus({ opportunityId: item.opportunityId, status: s.value as StageStatus })
                                  }
                                >
                                  Move to {s.label.toLowerCase()}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => void remove({ opportunityId: item.opportunityId })}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Remove from pipeline
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.opportunity.provider}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {deadlineLabel(item.opportunity.deadline, item.opportunity.rollingDeadline)}
                        </span>
                        {next && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            onClick={() =>
                              void setStatus({ opportunityId: item.opportunityId, status: next.value as StageStatus })
                            }
                          >
                            {next.label.split(" ")[0]} <ArrowRight className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {data && data.bookmarked.length > 0 && (
        <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-dashed bg-card/50 p-5">
          <h2 className="text-sm font-semibold">Bookmarked, not yet tracked ({data.bookmarked.length})</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.bookmarked.map((o) => (
              <Link
                key={o._id.toString()}
                to={`/app/opportunity/${o._id}`}
                className="group inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40"
              >
                <span>{o.media[0]?.emoji ?? "✨"}</span>
                <span className="max-w-48 truncate">{o.title}</span>
                <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
