"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@leadpilot/ui/components/ui/button";
import { Input } from "@leadpilot/ui/components/ui/input";
import { Label } from "@leadpilot/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@leadpilot/ui/components/ui/select";
import { createTeamMember } from "@/lib/api";

const roleOptions = ["viewer", "staff", "manager", "owner"] as const;

export function TeamMemberForm({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState<(typeof roleOptions)[number]>("viewer");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const member = await createTeamMember({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        role
      });
      setState("success");
      setMessage(`${member.user.email} was added as ${member.role}.`);
      event.currentTarget.reset();
      setRole("viewer");
      router.refresh();
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Could not add team member");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
        <div className="grid gap-1.5">
          <Label htmlFor="memberName">Name</Label>
          <Input id="memberName" name="name" required minLength={2} disabled={!canManage} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="memberEmail">Email</Label>
          <Input id="memberEmail" name="email" type="email" required disabled={!canManage} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="memberRole">Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as (typeof roleOptions)[number])} disabled={!canManage}>
            <SelectTrigger id="memberRole">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-fit" disabled={!canManage || state === "loading"}>
        {state === "loading" ? "Adding..." : "Add member"}
      </Button>
      {message ? (
        <p className={`rounded-md px-4 py-3 text-sm ${state === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
