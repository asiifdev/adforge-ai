"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PlatformSelector from "./PlatformSelector";
import { briefSchema, type BriefInput } from "@/lib/validators/brief";

type Props = {
  projectId: string;
  initialBrief?: BriefInput | null;
};

const TEMPLATES: Record<string, Partial<BriefInput>> = {
  ecommerce: {
    goal: "conversions",
    tone: "aggressive",
    targetAudience: "Online shoppers looking for great deals, price-conscious, mobile-first buyers",
  },
  saas: {
    goal: "clicks",
    tone: "professional",
    targetAudience: "B2B decision makers, SMB owners, frustrated with current tools",
  },
  leadgen: {
    goal: "conversions",
    tone: "professional",
    targetAudience: "Adults 25-55 seeking financial/health/professional outcomes, homeowners",
  },
  affiliate: {
    goal: "clicks",
    tone: "casual",
    targetAudience: "Impulse buyers, deal-seekers, social media users aged 18-45",
  },
};

export default function BriefForm({ projectId, initialBrief }: Props) {
  const router = useRouter();

  const { register, handleSubmit, control, reset, setValue, formState: { errors, isSubmitting } } = useForm<BriefInput>({
    resolver: zodResolver(briefSchema),
    defaultValues: initialBrief ?? {
      variationsPerPlatform: 5,
      platforms: ["google", "meta"],
    },
  });

  useEffect(() => {
    if (initialBrief) reset(initialBrief);
  }, [initialBrief, reset]);

  function applyTemplate(templateKey: string) {
    const t = TEMPLATES[templateKey];
    if (!t) return;
    Object.entries(t).forEach(([key, value]) => {
      setValue(key as keyof BriefInput, value as never);
    });
    toast.success(`Applied ${templateKey} template`);
  }

  async function onSubmit(data: BriefInput) {
    try {
      const res = await fetch(`/api/projects/${projectId}/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.message ?? "Failed to save brief");
        return;
      }

      toast.success("Brief saved! Redirecting to generation…");
      router.push(`/dashboard/projects/${projectId}/creatives`);
    } catch {
      toast.error("Failed to save brief. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quick Templates</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.keys(TEMPLATES).map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(key)}
                className="capitalize"
              >
                {key === "leadgen" ? "Lead Gen" : key === "ecommerce" ? "E-commerce" : key === "saas" ? "SaaS" : "Affiliate"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product / Offer Name *</Label>
            <Input
              id="productName"
              placeholder="e.g. QuickBooks, SolarCity Solar Panels, Masterclass"
              {...register("productName")}
            />
            {errors.productName && <p className="text-sm text-destructive">{errors.productName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your product or offer. What does it do? What's the main benefit? What problem does it solve?"
              className="min-h-[100px]"
              {...register("description")}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience *</Label>
            <Textarea
              id="targetAudience"
              placeholder="Who are you targeting? Demographics, interests, pain points, buying behavior"
              className="min-h-[80px]"
              {...register("targetAudience")}
            />
            {errors.targetAudience && <p className="text-sm text-destructive">{errors.targetAudience.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="landingUrl">Landing Page URL (optional)</Label>
            <Input
              id="landingUrl"
              type="url"
              placeholder="https://yoursite.com/landing"
              {...register("landingUrl")}
            />
            {errors.landingUrl && <p className="text-sm text-destructive">{errors.landingUrl.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Campaign Goal *</Label>
              <Controller
                name="goal"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversions">Conversions</SelectItem>
                      <SelectItem value="clicks">Clicks</SelectItem>
                      <SelectItem value="awareness">Awareness</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.goal && <p className="text-sm text-destructive">{errors.goal.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tone *</Label>
              <Controller
                name="tone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tone && <p className="text-sm text-destructive">{errors.tone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Variations per Platform *</Label>
              <Controller
                name="variationsPerPlatform"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value != null ? String(field.value) : ""}
                    onValueChange={(v) => v && field.onChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} variations
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetRange">Budget Range (optional)</Label>
            <Input
              id="budgetRange"
              placeholder="e.g. $5,000/day, $100K/month"
              {...register("budgetRange")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target Platforms *</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="platforms"
            control={control}
            render={({ field }) => (
              <PlatformSelector
                value={field.value ?? []}
                onChange={field.onChange}
                error={errors.platforms?.message}
              />
            )}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? "Saving…" : "Save Brief & Continue →"}
        </Button>
      </div>
    </form>
  );
}
