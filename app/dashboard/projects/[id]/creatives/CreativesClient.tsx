"use client";

import { useState, useCallback } from "react";
import { Sparkles, GitCompare, Star } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import VariationCard from "@/components/creatives/VariationCard";
import StreamingIndicator from "@/components/shared/StreamingIndicator";
import ExportMenu from "@/components/export/ExportMenu";
import type { Variation } from "@prisma/client";

type VariationData = {
  id: string;
  platform: string;
  content: unknown;
  isFavorite: boolean;
  label: string | null;
  notes: string | null;
  position: number;
};

type Props = {
  projectId: string;
  brief: {
    platforms: string[];
    variationsPerPlatform: number;
    productName: string;
  };
  initialVariations: Variation[];
  platforms: string[];
};

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  tiktok: "TikTok Ads",
  taboola: "Taboola",
};

export default function CreativesClient({ projectId, brief, initialVariations, platforms }: Props) {
  const [variations, setVariations] = useState<VariationData[]>(
    initialVariations.map((v) => ({
      id: v.id,
      platform: v.platform,
      content: v.content,
      isFavorite: v.isFavorite,
      label: v.label,
      notes: v.notes,
      position: v.position,
    }))
  );
  const [generating, setGenerating] = useState(false);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [completedPlatforms, setCompletedPlatforms] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<string[]>([]);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState(platforms[0] ?? "google");

  async function handleGenerate() {
    setGenerating(true);
    setCompletedPlatforms([]);
    setActivePlatform(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok || !res.body) {
        toast.error("Generation failed. Check your API key.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const eventLine = lines[lines.indexOf(line) - 1] ?? "";
              const event = eventLine.replace("event: ", "").trim();
              const data = JSON.parse(line.slice(6));

              if (event === "platform_start") {
                setActivePlatform(data.platform);
              } else if (event === "variation") {
                setVariations((prev) => {
                  const exists = prev.find((v) => v.id === data.variation.id);
                  if (exists) return prev;
                  return [...prev, {
                    id: data.variation.id,
                    platform: data.variation.platform,
                    content: data.variation.content,
                    isFavorite: data.variation.isFavorite,
                    label: data.variation.label,
                    notes: data.variation.notes,
                    position: data.variation.position,
                  }];
                });
              } else if (event === "platform_complete") {
                setCompletedPlatforms((prev) => [...prev, data.platform]);
                setActivePlatform(null);
              } else if (event === "done") {
                toast.success(`Generated ${data.totalVariations} variations!`);
              } else if (event === "error") {
                toast.error(data.message ?? "Generation error");
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch {
      toast.error("Connection error during generation");
    } finally {
      setGenerating(false);
      setActivePlatform(null);
    }
  }

  const handleUpdate = useCallback((id: string, updates: Partial<VariationData>) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setVariations((prev) => prev.filter((v) => v.id !== id));
    setCompareSelected((prev) => prev.filter((s) => s !== id));
  }, []);

  const handleRegenerate = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${projectId}/variations/${id}/regenerate`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Regeneration failed");
    const updated = await res.json();
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, content: updated.content } : v))
    );
  }, [projectId]);

  function handleCompareToggle(id: string) {
    setCompareSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const platformVariations = (platform: string) => {
    let list = variations.filter((v) => v.platform === platform);
    if (filterFavorites) list = list.filter((v) => v.isFavorite);
    return list;
  };

  const compareVariations = variations.filter((v) => compareSelected.includes(v.id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {generating ? "Generating…" : variations.length > 0 ? "Generate More" : "Generate Creatives"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={filterFavorites ? "border-amber-400 bg-amber-50 text-amber-700" : ""}
          >
            <Star className={`h-4 w-4 mr-1 ${filterFavorites ? "fill-amber-400" : ""}`} />
            Starred
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setCompareSelected([]);
            }}
            className={compareMode ? "border-indigo-400 bg-indigo-50 text-indigo-700" : ""}
          >
            <GitCompare className="h-4 w-4 mr-1" />
            Compare
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {compareMode && compareSelected.length > 0 && (
            <Badge variant="secondary">{compareSelected.length}/2 selected</Badge>
          )}
          <ExportMenu projectId={projectId} />
        </div>
      </div>

      {/* Generation progress */}
      {generating && (
        <StreamingIndicator
          activePlatform={activePlatform}
          completedPlatforms={completedPlatforms}
          totalPlatforms={brief.platforms}
        />
      )}

      {/* Compare mode */}
      {compareMode && compareSelected.length === 2 && (
        <div className="grid grid-cols-2 gap-4">
          {compareVariations.map((v) => (
            <div key={v.id} className="space-y-1">
              <Badge className="text-xs">{PLATFORM_LABELS[v.platform] ?? v.platform}</Badge>
              <VariationCard
                variation={v}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onRegenerate={handleRegenerate}
                isCompareSelected={compareSelected.includes(v.id)}
                onCompareToggle={handleCompareToggle}
                showCompareCheckbox={compareMode}
              />
            </div>
          ))}
        </div>
      )}

      {/* Platform tabs */}
      {!compareMode || compareSelected.length < 2 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {platforms.map((p) => {
              const count = platformVariations(p).length;
              return (
                <TabsTrigger key={p} value={p}>
                  {PLATFORM_LABELS[p] ?? p}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs px-1">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {platforms.map((p) => {
            const pvars = platformVariations(p);
            return (
              <TabsContent key={p} value={p} className="mt-4">
                {generating && activePlatform === p && pvars.length === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                  </div>
                )}

                {pvars.length === 0 && !generating ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No creatives yet for {PLATFORM_LABELS[p]}</p>
                    <p className="text-sm mt-1">Click &quot;Generate Creatives&quot; to start</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pvars.map((v) => (
                      <VariationCard
                        key={v.id}
                        variation={v}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onRegenerate={handleRegenerate}
                        isCompareSelected={compareSelected.includes(v.id)}
                        onCompareToggle={handleCompareToggle}
                        showCompareCheckbox={compareMode}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : null}
    </div>
  );
}
