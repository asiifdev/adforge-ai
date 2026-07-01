"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  projectId: string;
  projectName: string;
  isArchived?: boolean;
  hasGenerated?: boolean;
};

export default function ProjectActions({ projectId, projectName, isArchived, hasGenerated }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchiveToggle() {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isArchived ? (hasGenerated ? "generated" : "draft") : "archived" }),
      });
      toast.success(isArchived ? `"${projectName}" restored` : `"${projectName}" archived`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to duplicate project");
        return;
      }
      const { id } = await res.json();
      toast.success(`"${projectName}" duplicated`);
      router.push(`/dashboard/projects/${id}/brief`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      toast.success(`"${projectName}" deleted`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${projectId}/brief`)}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Edit Brief
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-3.5 w-3.5 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleArchiveToggle}>
          {isArchived ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
              Restore
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5 mr-2" />
              Archive
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
