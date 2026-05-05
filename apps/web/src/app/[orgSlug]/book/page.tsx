import { notFound } from "next/navigation";
import { PublicBookingForm } from "@/app/book/public-booking-form";
import { getPublicOrganization } from "@/lib/api";

export default async function OrganizationBookPage({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  try {
    const organization = await getPublicOrganization(orgSlug);
    return <PublicBookingForm organization={organization} />;
  } catch {
    notFound();
  }
}
