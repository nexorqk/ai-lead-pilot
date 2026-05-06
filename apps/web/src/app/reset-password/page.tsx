"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { getPasswordResetPreview, completePasswordReset } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [preview, setPreview] = useState<{ email: string; name: string; expiresAt: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getPasswordResetPreview(token)
      .then(setPreview)
      .catch((caught) => {
        setPreviewError(caught instanceof Error ? caught.message : "Invalid or expired link");
      });
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setStatus("loading");
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      setStatus("error");
      setError("Passwords do not match");
      return;
    }

    try {
      await completePasswordReset({ token, password });
      setStatus("success");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Reset failed");
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This password reset link is missing or invalid.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password" className="text-sm text-slate-600 underline hover:text-slate-900">
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (previewError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link expired</CardTitle>
            <CardDescription>{previewError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password" className="text-sm text-slate-600 underline hover:text-slate-900">
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create new password</CardTitle>
          <CardDescription>
            Set a new password for <strong>{preview.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "success" ? (
            <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password updated successfully. Redirecting to login...
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <Button disabled={status === "loading"}>{status === "loading" ? "Saving..." : "Update password"}</Button>
              {status === "error" ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ResetPasswordLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    </main>
  );
}
