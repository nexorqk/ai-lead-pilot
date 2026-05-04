"use client";

import { useRouter } from "next/navigation";
import { Button } from "@leadpilot/ui/components/ui/button";
import { logout } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await logout().catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={onLogout}>
      Log out
    </Button>
  );
}
