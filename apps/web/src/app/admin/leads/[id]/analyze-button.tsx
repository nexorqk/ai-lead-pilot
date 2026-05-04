"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { analyzeLead } from "@/lib/api";
import { Button } from "@leadpilot/ui/components/ui/button";

export function AnalyzeButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function runAnalysis() {
    setStatus("loading");
    setError("");
    try {
      await analyzeLead(leadId);
      setStatus("idle");
      router.refresh();
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Analysis failed");
    }
  }

  return (
    <div>
      <Button
        onClick={runAnalysis}
        disabled={status === "loading"}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {status === "loading" ? "Analyzing..." : "Run AI analysis"}
      </Button>
      {status === "error" ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
