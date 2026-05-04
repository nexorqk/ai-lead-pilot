import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./api";

export async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function requireCurrentUser() {
  const cookieHeader = await getCookieHeader();
  try {
    const { user } = await getCurrentUser(cookieHeader);
    return { user, cookieHeader };
  } catch {
    redirect("/login");
  }
}
