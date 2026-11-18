"use client";
import { useEffect } from "react";
export function ActivityView({
  kind,
  targetId,
}: {
  kind: "post" | "product" | "search";
  targetId: string;
}) {
  useEffect(() => {
    void fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        kind === "search" ? { kind, query: targetId } : { kind, targetId },
      ),
    }).catch(() => {});
  }, [kind, targetId]);
  return null;
}
