"use client";

import { useState } from "react";
import { Star, Trash2, RefreshCw, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CharacterCounter from "./CharacterCounter";
import type { GoogleContent, MetaContent, TikTokContent, TaboolaContent } from "@/lib/validators/variation";

const CHAR_LIMITS: Record<string, Record<string, number>> = {
  google: { headline: 30, description: 90 },
  meta: { primaryText: 125, headline: 40, description: 30 },
  taboola: { headline: 60, bodyText: 250, thumbnailDescription: 150 },
};

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
  variation: VariationData;
  onUpdate: (id: string, updates: Partial<VariationData>) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => Promise<void>;
  isCompareSelected?: boolean;
  onCompareToggle?: (id: string) => void;
  showCompareCheckbox?: boolean;
};

export default function VariationCard({
  variation,
  onUpdate,
  onDelete,
  onRegenerate,
  isCompareSelected,
  onCompareToggle,
  showCompareCheckbox,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(variation.notes ?? "");

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await onRegenerate(variation.id);
      toast.success("Variation regenerated");
    } catch {
      toast.error("Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleToggleFavorite() {
    const newVal = !variation.isFavorite;
    onUpdate(variation.id, { isFavorite: newVal });
    await fetch(`/api/projects/${getProjectId()}/variations/${variation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: newVal }),
    });
  }

  async function handleLabelChange(label: string | null) {
    const val = !label || label === "none" ? null : label;
    onUpdate(variation.id, { label: val });
    await fetch(`/api/projects/${getProjectId()}/variations/${variation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: val }),
    });
  }

  async function handleSaveNotes() {
    onUpdate(variation.id, { notes });
    setEditingNotes(false);
    await fetch(`/api/projects/${getProjectId()}/variations/${variation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function handleDelete() {
    onDelete(variation.id);
    await fetch(`/api/projects/${getProjectId()}/variations/${variation.id}`, {
      method: "DELETE",
    });
  }

  function handleCopy() {
    const text = formatContentForClipboard(variation.platform, variation.content);
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  function getProjectId() {
    if (typeof window !== "undefined") {
      return window.location.pathname.split("/")[3] ?? "";
    }
    return "";
  }

  return (
    <div
      className={`rounded-lg border bg-card shadow-sm transition-all ${
        isCompareSelected ? "ring-2 ring-indigo-500" : ""
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {showCompareCheckbox && (
            <input
              type="checkbox"
              checked={isCompareSelected}
              onChange={() => onCompareToggle?.(variation.id)}
              className="rounded"
            />
          )}
          <span className="text-xs text-muted-foreground font-mono">#{variation.position + 1}</span>
          {variation.label && (
            <Badge variant="outline" className="text-xs px-1.5">
              {variation.label}
            </Badge>
          )}
          {variation.isFavorite && (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <Select
            value={variation.label ?? "none"}
            onValueChange={handleLabelChange}
          >
            <SelectTrigger className="h-7 w-[70px] text-xs">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleFavorite}>
            <Star
              className={`h-3.5 w-3.5 ${variation.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
            />
          </Button>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <VariationContent platform={variation.platform} content={variation.content} />

          <div className="border-t pt-3">
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes…"
                  className="text-sm min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveNotes}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {notes ? `📝 ${notes}` : "+ Add note"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VariationContent({ platform, content }: { platform: string; content: unknown }) {
  if (platform === "google") {
    const c = content as GoogleContent;
    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Headlines ({c.headlines.length}/15)
          </p>
          <div className="space-y-1">
            {c.headlines.map((h, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                <span className={`flex-1 ${h.length > 30 ? "text-destructive" : ""}`}>{h}</span>
                <CharacterCounter current={h.length} limit={CHAR_LIMITS.google.headline} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Descriptions ({c.descriptions.length}/4)
          </p>
          <div className="space-y-1">
            {c.descriptions.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                <span className={`flex-1 ${d.length > 90 ? "text-destructive" : ""}`}>{d}</span>
                <CharacterCounter current={d.length} limit={CHAR_LIMITS.google.description} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (platform === "meta") {
    const c = content as MetaContent;
    return (
      <div className="space-y-2 text-sm">
        <FieldRow label="Primary Text" value={c.primaryText} limit={125} />
        <FieldRow label="Headline" value={c.headline} limit={40} />
        <FieldRow label="Description" value={c.description} limit={30} />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CTA</span>
          <Badge variant="secondary" className="text-xs">{c.callToAction}</Badge>
        </div>
      </div>
    );
  }

  if (platform === "tiktok") {
    const c = content as TikTokContent;
    return (
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hook (0–3s)</p>
          <p className="text-sm bg-muted/50 rounded p-2">{c.hook}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Body (4–25s)</p>
          <p className="text-sm bg-muted/50 rounded p-2">{c.body}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">CTA (last 5s)</p>
          <p className="text-sm bg-muted/50 rounded p-2">{c.cta}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">On-Screen Text</p>
          <div className="flex flex-wrap gap-1">
            {c.onScreenText.map((t, i) => (
              <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (platform === "taboola") {
    const c = content as TaboolaContent;
    return (
      <div className="space-y-2 text-sm">
        <FieldRow label="Headline" value={c.headline} limit={60} />
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</span>
            <CharacterCounter current={c.bodyText.length} limit={250} />
          </div>
          <p className="text-sm bg-muted/50 rounded p-2">{c.bodyText}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Thumbnail</p>
          <p className="text-sm text-muted-foreground italic">{c.thumbnailDescription}</p>
        </div>
      </div>
    );
  }

  return <pre className="text-xs">{JSON.stringify(content, null, 2)}</pre>;
}

function FieldRow({ label, value, limit }: { label: string; value: string; limit: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <CharacterCounter current={value.length} limit={limit} />
      </div>
      <p className={`text-sm bg-muted/50 rounded p-2 ${value.length > limit ? "border border-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function formatContentForClipboard(platform: string, content: unknown): string {
  if (platform === "google") {
    const c = content as GoogleContent;
    return [
      "=== HEADLINES ===",
      ...c.headlines.map((h, i) => `${i + 1}. ${h}`),
      "",
      "=== DESCRIPTIONS ===",
      ...c.descriptions.map((d, i) => `${i + 1}. ${d}`),
    ].join("\n");
  }
  if (platform === "meta") {
    const c = content as MetaContent;
    return [
      `Primary Text: ${c.primaryText}`,
      `Headline: ${c.headline}`,
      `Description: ${c.description}`,
      `CTA: ${c.callToAction}`,
    ].join("\n");
  }
  if (platform === "tiktok") {
    const c = content as TikTokContent;
    return [
      `Hook: ${c.hook}`,
      `Body: ${c.body}`,
      `CTA: ${c.cta}`,
      `On-Screen Text: ${c.onScreenText.join(" | ")}`,
    ].join("\n");
  }
  if (platform === "taboola") {
    const c = content as TaboolaContent;
    return [
      `Headline: ${c.headline}`,
      `Body: ${c.bodyText}`,
      `Thumbnail: ${c.thumbnailDescription}`,
    ].join("\n");
  }
  return JSON.stringify(content, null, 2);
}
