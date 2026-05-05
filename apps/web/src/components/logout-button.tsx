"use client";

import { Button } from "@leadpilot/ui/components/ui/button";
import { logout } from "@/lib/api";

export function LogoutButton() {
  async function onLogout() {
    await logout().catch(() => undefined);
    window.location.href = "/login";
  }

  return (
    <Button variant="outline" size="sm" onClick={onLogout}>
      Log out
    </Button>
  );
}
