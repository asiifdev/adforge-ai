"use client";

import { Badge } from "@/components/ui/badge";

const PLATFORMS = [
  { id: "google", label: "Google Ads", description: "RSA — 15 headlines, 4 descriptions" },
  { id: "meta", label: "Meta Ads", description: "Facebook & Instagram — 3 variants" },
  { id: "tiktok", label: "TikTok Ads", description: "Video scripts — Hook, body, CTA" },
  { id: "taboola", label: "Taboola", description: "Native ads — curiosity-gap headlines" },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PLATFORMS.map((p) => {
          const selected = value.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                selected
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                  : "border-input hover:border-indigo-300 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="font-medium text-sm">{p.label}</span>
                {selected && (
                  <Badge className="ml-auto text-xs bg-indigo-600">Selected</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{p.description}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
