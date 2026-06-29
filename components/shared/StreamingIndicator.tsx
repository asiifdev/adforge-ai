"use client";

import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2 } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  tiktok: "TikTok Ads",
  taboola: "Taboola",
};

const PLATFORM_COLORS: Record<string, { active: string; done: string; idle: string; dot: string }> = {
  google: { active: "bg-blue-100 text-blue-700 border-blue-200", done: "bg-blue-50 text-blue-600 border-blue-100", idle: "bg-muted text-muted-foreground border-border", dot: "text-blue-500" },
  meta: { active: "bg-violet-100 text-violet-700 border-violet-200", done: "bg-violet-50 text-violet-600 border-violet-100", idle: "bg-muted text-muted-foreground border-border", dot: "text-violet-500" },
  tiktok: { active: "bg-rose-100 text-rose-700 border-rose-200", done: "bg-rose-50 text-rose-600 border-rose-100", idle: "bg-muted text-muted-foreground border-border", dot: "text-rose-500" },
  taboola: { active: "bg-orange-100 text-orange-700 border-orange-200", done: "bg-orange-50 text-orange-600 border-orange-100", idle: "bg-muted text-muted-foreground border-border", dot: "text-orange-500" },
};

type Props = {
  activePlatform: string | null;
  completedPlatforms: string[];
  totalPlatforms: string[];
};

export default function StreamingIndicator({ activePlatform, completedPlatforms, totalPlatforms }: Props) {
  const progress = totalPlatforms.length
    ? Math.round((completedPlatforms.length / totalPlatforms.length) * 100)
    : 0;

  const allDone = completedPlatforms.length === totalPlatforms.length;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {allDone ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          )}
          <span className="text-sm font-medium">
            {activePlatform
              ? `Generating ${PLATFORM_LABELS[activePlatform] ?? activePlatform}…`
              : allDone
              ? "All creatives generated!"
              : "Starting generation…"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {completedPlatforms.length}/{totalPlatforms.length} platforms
        </span>
      </div>

      <Progress value={progress} className="h-1.5" />

      <div className="flex gap-2 flex-wrap">
        {totalPlatforms.map((p) => {
          const done = completedPlatforms.includes(p);
          const active = activePlatform === p;
          const colors = PLATFORM_COLORS[p] ?? {
            active: "bg-indigo-100 text-indigo-700 border-indigo-200",
            done: "bg-green-50 text-green-600 border-green-100",
            idle: "bg-muted text-muted-foreground border-border",
            dot: "text-indigo-500",
          };

          return (
            <div
              key={p}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                done ? colors.done : active ? colors.active : colors.idle
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : active ? (
                <span className={`inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse`} />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-30" />
              )}
              {PLATFORM_LABELS[p] ?? p}
            </div>
          );
        })}
      </div>
    </div>
  );
}
