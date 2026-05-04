"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { analyzeLead } from "@/lib/api";

export function AnalyzeButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function runAnalysis() {
    setStatus("loading");
    setError("");
    try {
      await analyzeLead(leadId);
      router.refresh();
      setStatus("idle");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Analysis failed");
    }
  }

  return (
    <div>
      <button
        onClick={runAnalysis}
        disabled={status === "loading"}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {status === "loading" ? "Analyzing..." : "Run AI analysis"}
      </button>
      {status === "error" ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
