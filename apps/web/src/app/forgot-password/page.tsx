"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await requestPasswordReset({
        email: String(form.get("email") ?? "")
      });
      setStatus("success");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Request failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Enter your email and we will send you a link to reset your password.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" ? (
            <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              If an account exists with this email, a password reset link has been sent.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <Button disabled={status === "loading"}>{status === "loading" ? "Sending..." : "Send reset link"}</Button>
              {status === "error" ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            </form>
          )}
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-slate-600 underline hover:text-slate-900">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
