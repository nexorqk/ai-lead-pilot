import { badgeClass } from "@/lib/format";
import { Badge as UiBadge } from "@leadpilot/ui/components/ui/badge";

export function Badge({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <UiBadge variant="outline" className={`px-2.5 py-1 font-medium ring-1 ${badgeClass(value)}`}>
      {children}
    </UiBadge>
  );
}
