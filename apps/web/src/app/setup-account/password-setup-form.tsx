"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@leadpilot/ui/components/ui/card";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { completePasswordSetup, getPasswordSetupPreview, type PasswordSetupPreview } from "@/lib/api";

type State = "loading" | "ready" | "submitting" | "success" | "invalid";

export function PasswordSetupForm({ token }: { token: string }) {
  const [state, setState] = useState<State>("loading");
  const [preview, setPreview] = useState<PasswordSetupPreview | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      setMessage("Missing setup token.");
      return;
    }

    let active = true;
    getPasswordSetupPreview(token)
      .then((result) => {
        if (!active) return;
        setPreview(result);
        setState("ready");
      })
      .catch((caught) => {
        if (!active) return;
        setState("invalid");
        setMessage(caught instanceof Error ? caught.message : "Invalid setup link");
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const password = String(form.get("password") ?? "");
      const confirm = String(form.get("confirm") ?? "");
      if (password !== confirm) {
        throw new Error("Passwords do not match.");
      }

      const result = await completePasswordSetup({ token, password });
      setState("success");
      setMessage(`Password set for ${result.email}. You can log in now.`);
      event.currentTarget.reset();
    } catch (caught) {
      setState("ready");
      setMessage(caught instanceof Error ? caught.message : "Could not set password");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up account</CardTitle>
          <CardDescription>
            {preview ? `Create a password for ${preview.name} at ${preview.organizationName}.` : "Create your password to activate the account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state === "invalid" ? <p className="mb-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}
          {state === "success" ? (
            <div className="grid gap-4">
              <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required disabled={state !== "ready"} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={state !== "ready"} />
              </div>
              <Button disabled={state !== "ready"}>
                {state === "submitting" ? "Setting password..." : "Set password"}
              </Button>
              {message && state !== "invalid" ? <p className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p> : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
