"use client";

import { Progress } from "@/components/ui/progress";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  tiktok: "TikTok Ads",
  taboola: "Taboola",
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

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {activePlatform
            ? `Generating ${PLATFORM_LABELS[activePlatform] ?? activePlatform}…`
            : completedPlatforms.length === totalPlatforms.length
            ? "Generation complete!"
            : "Starting…"}
        </span>
        <span className="text-muted-foreground">{completedPlatforms.length}/{totalPlatforms.length} platforms</span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex gap-3 flex-wrap">
        {totalPlatforms.map((p) => {
          const done = completedPlatforms.includes(p);
          const active = activePlatform === p;
          return (
            <div
              key={p}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                done
                  ? "bg-green-100 text-green-700"
                  : active
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? (
                <span>✓</span>
              ) : active ? (
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              ) : (
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
              {PLATFORM_LABELS[p] ?? p}
            </div>
          );
        })}
      </div>
    </div>
  );
}
