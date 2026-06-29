"use client";

const PLATFORMS = [
  {
    id: "google",
    label: "Google Ads",
    description: "RSA — 15 headlines, 4 descriptions",
    emoji: "🔵",
    accent: "border-blue-400 bg-blue-50 ring-blue-400",
    dot: "bg-blue-500",
  },
  {
    id: "meta",
    label: "Meta Ads",
    description: "Facebook & Instagram — primary text, headline, CTA",
    emoji: "🟣",
    accent: "border-violet-400 bg-violet-50 ring-violet-400",
    dot: "bg-violet-500",
  },
  {
    id: "tiktok",
    label: "TikTok Ads",
    description: "Video scripts — Hook, body, CTA, on-screen text",
    emoji: "🎵",
    accent: "border-rose-400 bg-rose-50 ring-rose-400",
    dot: "bg-rose-500",
  },
  {
    id: "taboola",
    label: "Taboola",
    description: "Native ads — curiosity-gap headlines & body",
    emoji: "🟠",
    accent: "border-orange-400 bg-orange-50 ring-orange-400",
    dot: "bg-orange-500",
  },
] as const;

type Props = {
  value: string[];
  onChange: (platforms: string[]) => void;
  error?: string;
};

export default function PlatformSelector({ value, onChange, error }: Props) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((p) => p !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PLATFORMS.map((p) => {
          const selected = value.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                selected
                  ? `${p.accent} ring-1`
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
              }`}
            >
              <span className="text-xl leading-none">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.label}</span>
                  {selected && (
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${p.dot}`} />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
