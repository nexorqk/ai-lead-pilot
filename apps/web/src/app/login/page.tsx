"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await login({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? "")
      });
      router.push("/admin");
      router.refresh();
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Use your organization account to access the admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" defaultValue="owner@demo.leadpilot.local" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" defaultValue="demo-password-123" required />
            </div>
            <Button disabled={status === "loading"}>{status === "loading" ? "Logging in..." : "Log in"}</Button>
          </form>
          {status === "error" ? <p className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
