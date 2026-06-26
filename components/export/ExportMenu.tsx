"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  projectId: string;
};

export default function ExportMenu({ projectId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport(format: "csv" | "json" | "pdf") {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=${format}`);
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.message ?? "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="(.+)"/)?.[1] ?? `export.${format}`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Download CSV (Ad Manager)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Download JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          Download PDF Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
