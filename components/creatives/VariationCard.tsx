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

const PLATFORM_STYLE: Record<string, { header: string; dot: string; label: string }> = {
  google: { header: "bg-blue-50 border-blue-100", dot: "bg-blue-500", label: "Google Ads" },
  meta: { header: "bg-violet-50 border-violet-100", dot: "bg-violet-500", label: "Meta Ads" },
  tiktok: { header: "bg-rose-50 border-rose-100", dot: "bg-rose-500", label: "TikTok Ads" },
  taboola: { header: "bg-orange-50 border-orange-100", dot: "bg-orange-500", label: "Taboola" },
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
  projectId: string;
  variation: VariationData;
  onUpdate: (id: string, updates: Partial<VariationData>) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => Promise<void>;
  isCompareSelected?: boolean;
  onCompareToggle?: (id: string) => void;
  showCompareCheckbox?: boolean;
};

// Mirrors the server-side merge in regenerate-field/route.ts so the UI can patch
// local state immediately without waiting for a full variation refetch.
function applyFieldToContent(content: unknown, field: string, value: string): unknown {
  const obj = { ...(content as Record<string, unknown>) };
  const arrayMatch = field.match(/^(headline|description)_(\d+)$/);

  if (arrayMatch) {
    const [, key, idxStr] = arrayMatch;
    const arrayKey = key === "headline" ? "headlines" : "descriptions";
    const idx = parseInt(idxStr, 10) - 1;
    const arr = Array.isArray(obj[arrayKey]) ? [...(obj[arrayKey] as string[])] : [];
    if (idx >= 0 && idx < arr.length) arr[idx] = value;
    obj[arrayKey] = arr;
    return obj;
  }

  obj[field] = value;
  return obj;
}

export default function VariationCard({
  projectId,
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
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(variation.notes ?? "");

  async function handleRegenerateField(field: string) {
    setRegeneratingField(field);
    try {
      const res = await fetch(`/api/projects/${projectId}/variations/${variation.id}/regenerate-field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      if (!res.ok) throw new Error("Field regeneration failed");
      const { value } = await res.json();
      onUpdate(variation.id, { content: applyFieldToContent(variation.content, field, value) });
      toast.success("Field regenerated");
    } catch {
      toast.error("Failed to regenerate field — please try again");
    } finally {
      setRegeneratingField(null);
    }
  }

  const style = PLATFORM_STYLE[variation.platform] ?? {
    header: "bg-muted border-border",
    dot: "bg-muted-foreground",
    label: variation.platform,
  };

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
    try {
      await fetch(`/api/projects/${projectId}/variations/${variation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newVal }),
      });
    } catch {
      onUpdate(variation.id, { isFavorite: !newVal });
      toast.error("Failed to save — please try again");
    }
  }

  async function handleLabelChange(label: string | null) {
    const val = !label || label === "none" ? null : label;
    const prev = variation.label;
    onUpdate(variation.id, { label: val });
    try {
      await fetch(`/api/projects/${projectId}/variations/${variation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: val }),
      });
    } catch {
      onUpdate(variation.id, { label: prev });
      toast.error("Failed to save — please try again");
    }
  }

  async function handleSaveNotes() {
    const prevNotes = variation.notes;
    onUpdate(variation.id, { notes });
    setEditingNotes(false);
    try {
      await fetch(`/api/projects/${projectId}/variations/${variation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch {
      onUpdate(variation.id, { notes: prevNotes });
      setEditingNotes(true);
      toast.error("Failed to save notes — please try again");
    }
  }

  async function handleDelete() {
    onDelete(variation.id);
    try {
      await fetch(`/api/projects/${projectId}/variations/${variation.id}`, {
        method: "DELETE",
      });
    } catch {
      toast.error("Failed to delete — please refresh the page");
    }
  }

  function handleCopy() {
    const text = formatContentForClipboard(variation.platform, variation.content);
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div
      className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-150 ${
        isCompareSelected ? "ring-2 ring-indigo-500 border-indigo-300" : ""
      }`}
    >
      {/* Platform header bar */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${style.header}`}>
        <div className="flex items-center gap-2">
          {showCompareCheckbox && (
            <input
              type="checkbox"
              checked={isCompareSelected}
              onChange={() => onCompareToggle?.(variation.id)}
              className="rounded accent-indigo-600"
            />
          )}
          <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
          <span className="text-xs font-medium text-foreground/70">{style.label}</span>
          <span className="text-xs text-muted-foreground font-mono">#{variation.position + 1}</span>
          {variation.label && (
            <Badge variant="outline" className="text-xs px-1.5 h-4">
              {variation.label}
            </Badge>
          )}
          {variation.isFavorite && (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Select value={variation.label ?? "none"} onValueChange={handleLabelChange}>
            <SelectTrigger className="h-6 w-[58px] text-xs border-0 bg-transparent shadow-none">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleToggleFavorite}>
            <Star className={`h-3 w-3 ${variation.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </Button>

          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            <Copy className="h-3 w-3 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw className={`h-3 w-3 text-muted-foreground ${regenerating ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>

          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <VariationContent
            platform={variation.platform}
            content={variation.content}
            onRegenerateField={handleRegenerateField}
            regeneratingField={regeneratingField}
          />

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

type FieldRegenProps = {
  onRegenerateField: (field: string) => Promise<void>;
  regeneratingField: string | null;
};

function RegenFieldButton({ field, onRegenerateField, regeneratingField }: { field: string } & FieldRegenProps) {
  const isRegenerating = regeneratingField === field;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 shrink-0"
      disabled={regeneratingField !== null}
      onClick={() => onRegenerateField(field)}
      title="Regenerate this field"
    >
      <RefreshCw className={`h-3 w-3 text-muted-foreground ${isRegenerating ? "animate-spin" : ""}`} />
    </Button>
  );
}

function VariationContent({
  platform,
  content,
  onRegenerateField,
  regeneratingField,
}: { platform: string; content: unknown } & FieldRegenProps) {
  const regenProps = { onRegenerateField, regeneratingField };

  if (platform === "google") {
    const c = content as GoogleContent;
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Headlines ({c.headlines.length}/15)
          </p>
          <div className="space-y-1.5">
            {c.headlines.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-sm group/row">
                <span className="text-xs text-muted-foreground/60 w-4 shrink-0 mt-0.5">{i + 1}.</span>
                <span className={`flex-1 leading-snug ${h.length > 30 ? "text-destructive" : ""}`}>{h}</span>
                <CharacterCounter current={h.length} limit={CHAR_LIMITS.google.headline} />
                <RegenFieldButton field={`headline_${i + 1}`} {...regenProps} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Descriptions ({c.descriptions.length}/4)
          </p>
          <div className="space-y-1.5">
            {c.descriptions.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-xs text-muted-foreground/60 w-4 shrink-0 mt-0.5">{i + 1}.</span>
                <span className={`flex-1 leading-snug ${d.length > 90 ? "text-destructive" : ""}`}>{d}</span>
                <CharacterCounter current={d.length} limit={CHAR_LIMITS.google.description} />
                <RegenFieldButton field={`description_${i + 1}`} {...regenProps} />
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
      <div className="space-y-2.5 text-sm">
        <FieldRow label="Primary Text" value={c.primaryText} limit={125} field="primaryText" {...regenProps} />
        <FieldRow label="Headline" value={c.headline} limit={40} field="headline" {...regenProps} />
        <FieldRow label="Description" value={c.description} limit={30} field="description" {...regenProps} />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">CTA</span>
          <Badge variant="secondary" className="text-xs">{c.callToAction}</Badge>
        </div>
      </div>
    );
  }

  if (platform === "tiktok") {
    const c = content as TikTokContent;
    return (
      <div className="space-y-2.5 text-sm">
        <ContentBlock label="Hook (0–3s)" value={c.hook} field="hook" {...regenProps} />
        <ContentBlock label="Body (4–25s)" value={c.body} field="body" {...regenProps} />
        <ContentBlock label="CTA (last 5s)" value={c.cta} field="cta" {...regenProps} />
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">On-Screen Text</p>
          <div className="flex flex-wrap gap-1.5">
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
      <div className="space-y-2.5 text-sm">
        <FieldRow label="Headline" value={c.headline} limit={60} field="headline" {...regenProps} />
        <ContentBlock label="Body" value={c.bodyText} limit={250} field="bodyText" {...regenProps} />
        <ContentBlock label="Thumbnail" value={c.thumbnailDescription} field="thumbnailDescription" {...regenProps} italic />
      </div>
    );
  }

  return <pre className="text-xs">{JSON.stringify(content, null, 2)}</pre>;
}

function ContentBlock({
  label,
  value,
  limit,
  field,
  italic,
  onRegenerateField,
  regeneratingField,
}: { label: string; value: string; limit?: number; italic?: boolean } & FieldRegenProps & { field: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1">
          {limit !== undefined && <CharacterCounter current={value.length} limit={limit} />}
          <RegenFieldButton field={field} onRegenerateField={onRegenerateField} regeneratingField={regeneratingField} />
        </div>
      </div>
      <p className={`text-sm bg-muted/40 rounded-lg p-2.5 leading-relaxed ${italic ? "text-muted-foreground italic" : ""}`}>{value}</p>
    </div>
  );
}

function FieldRow({
  label,
  value,
  limit,
  field,
  onRegenerateField,
  regeneratingField,
}: { label: string; value: string; limit: number; field: string } & FieldRegenProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-1">
          <CharacterCounter current={value.length} limit={limit} />
          <RegenFieldButton field={field} onRegenerateField={onRegenerateField} regeneratingField={regeneratingField} />
        </div>
      </div>
      <p className={`text-sm bg-muted/40 rounded-lg p-2.5 leading-relaxed ${value.length > limit ? "border border-destructive" : ""}`}>{value}</p>
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
