"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search projects…"
          className="pl-8"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateParams("search", e.target.value)}
        />
      </div>

      <Select
        value={searchParams.get("platform") ?? "all"}
        onValueChange={(v) => updateParams("platform", !v || v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All platforms</SelectItem>
          <SelectItem value="google">Google Ads</SelectItem>
          <SelectItem value="meta">Meta Ads</SelectItem>
          <SelectItem value="tiktok">TikTok Ads</SelectItem>
          <SelectItem value="taboola">Taboola</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="Updated from"
        className="w-[150px]"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={(e) => updateParams("from", e.target.value)}
      />
      <Input
        type="date"
        aria-label="Updated to"
        className="w-[150px]"
        defaultValue={searchParams.get("to") ?? ""}
        onChange={(e) => updateParams("to", e.target.value)}
      />
    </div>
  );
}
