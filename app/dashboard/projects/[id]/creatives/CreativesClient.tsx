"use client";

import { useState, useCallback } from "react";
import { Sparkles, GitCompare, Star, Wand2 } from "lucide-react";
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

const PLATFORM_DOT: Record<string, string> = {
  google: "bg-blue-500",
  meta: "bg-violet-500",
  tiktok: "bg-rose-500",
  taboola: "bg-orange-500",
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
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "platform_start") {
                setActivePlatform(data.platform);
              } else if (currentEvent === "variation") {
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
              } else if (currentEvent === "platform_complete") {
                setCompletedPlatforms((prev) => [...prev, data.platform]);
                setActivePlatform(null);
              } else if (currentEvent === "done") {
                toast.success(`Generated ${data.totalVariations} variations!`);
              } else if (currentEvent === "error") {
                toast.error(data.message ?? "Generation error");
              }
              currentEvent = "";
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
  const totalVariations = variations.length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
          >
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            {generating ? "Generating…" : totalVariations > 0 ? "Regenerate" : "Generate Creatives"}
          </Button>

          {totalVariations > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={filterFavorites ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50" : ""}
              >
                <Star className={`h-3.5 w-3.5 mr-1.5 ${filterFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
                Starred
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompareMode(!compareMode);
                  if (compareMode) setCompareSelected([]);
                }}
                className={compareMode ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-50" : ""}
              >
                <GitCompare className="h-3.5 w-3.5 mr-1.5" />
                Compare
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {compareMode && compareSelected.length > 0 && (
            <Badge variant="secondary" className="text-xs">{compareSelected.length}/2 selected</Badge>
          )}
          {totalVariations > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {totalVariations} variation{totalVariations !== 1 ? "s" : ""}
            </span>
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
            <div key={v.id} className="space-y-1.5">
              <Badge className="text-xs">{PLATFORM_LABELS[v.platform] ?? v.platform}</Badge>
              <VariationCard
                projectId={projectId}
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
      {(!compareMode || compareSelected.length < 2) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            {platforms.map((p) => {
              const count = platformVariations(p).length;
              return (
                <TabsTrigger key={p} value={p} className="text-xs gap-1.5">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${PLATFORM_DOT[p] ?? "bg-muted-foreground"}`} />
                  {PLATFORM_LABELS[p] ?? p}
                  {count > 0 && (
                    <span className="ml-0.5 rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {platforms.map((p) => {
            const pvars = platformVariations(p);
            return (
              <TabsContent key={p} value={p} className="mt-5">
                {generating && activePlatform === p && pvars.length === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-52 rounded-xl" />
                    ))}
                  </div>
                )}

                {pvars.length === 0 && !generating ? (
                  <div className="text-center py-20 rounded-2xl border border-dashed text-muted-foreground bg-muted/10">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-6 w-6 opacity-40" />
                    </div>
                    <p className="font-medium text-sm">No creatives yet for {PLATFORM_LABELS[p]}</p>
                    <p className="text-xs mt-1 text-muted-foreground/70">Click &quot;Generate Creatives&quot; to start</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pvars.map((v) => (
                      <VariationCard
                        key={v.id}
                        projectId={projectId}
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
      )}
    </div>
  );
}
