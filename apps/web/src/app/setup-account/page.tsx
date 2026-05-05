import type { Metadata } from "next";
import { PasswordSetupForm } from "./password-setup-form";

export const metadata: Metadata = {
  title: "Set up account | LeadPilot AI"
};

export default async function SetupAccountPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PasswordSetupForm token={params.token ?? ""} />;
}
